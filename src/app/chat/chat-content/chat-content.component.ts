import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { MarkdownService } from 'ngx-markdown';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiKeyService } from 'src/app/services/api-key.service';
import { ChatCompletionRequestMessage } from 'openai';
import { DomSanitizer } from '@angular/platform-browser';
import hljs from 'highlight.js';

@Component({
  selector: 'app-chat-content',
  templateUrl: './chat-content.component.html',
  styleUrls: ['./chat-content.component.css'],
})
export class ChatContentComponent
  implements OnInit, AfterViewChecked, AfterViewInit {
  @ViewChild('window') window!: any;
  @ViewChild('textInput', { static: true }) textInputRef!: ElementRef;

  messages: ChatCompletionRequestMessage[] = [];
  apiKey: string | null = '';
  isBusy: boolean = false;
  currChatSelected: string = '';
  isComposing = false; // 用來標示是否正在選字

  // // 測試高亮語法用
  // parsedHtmlForTest;



  constructor(
    private chatService: ChatService,
    private markdownService: MarkdownService,
    private apiKeyService: ApiKeyService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
  ) {
    // // 測試高亮程式碼
    // let test123 = "```typescript\nimport { Pipe, PipeTransform } from '@angular/core';\nimport { DomSanitizer, SafeHtml } from '@angular/platform-browser';\n\n@Pipe({  name: 'safeHtml' })\nexport class SafeHtmlPipe implements PipeTransform {\n\nconstructor(private sanitizer: DomSanitizer) {\nconsole.log(789655,` class='${ cls }'`);\n  for (var i = 0 / 2; i < classes.length; i++) {\nif (checkCondition(classes[i]) === undefined)\n}\n }\n\ntransform(html: string):\n\nSafeHtml {  \n  return this.sanitizer.bypassSecurityTrustHtml(html); \n  } \n}```";
    // this.parsedHtmlForTest = this.parseApiResponse(test123);

  }



  ngOnInit(): void {
    this.scrollToBottom();

    // Subscribe to messages
    this.chatService.getMessagesSubject().subscribe((messages) => {
      this.messages = messages;
    });

    // Subscribe to the api key.
    this.apiKeyService.getApiKey().subscribe((apiKey) => {
      this.apiKey = apiKey;
    });
  }

  ngAfterViewInit() {
    this.textInputRef.nativeElement.focus();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }



  // 整理api response
  async createCompletion(element: HTMLTextAreaElement) {
    const prompt = element.value;
    if (prompt.length <= 1 || this.isBusy) {
      element.value = '';
      return;
    }

    element.value = '';
    const message: ChatCompletionRequestMessage = {
      role: 'user',
      content: prompt,
    };

    this.messages.push(message);
    try {
      this.isBusy = true;
      const completion = await this.chatService.createCompletionViaOpenAI(
        this.messages
      );
      console.log("解析前", completion.data.choices[0].message?.content!);

      let parsedHtml = this.parseApiResponse(completion.data.choices[0].message?.content!);

      const responseMessage: ChatCompletionRequestMessage = {
        role: 'assistant',
        content: parsedHtml,
      };

      this.messages.push(responseMessage);

    } catch (err) {
      this.snackBar.open(
        'API Request Failed, please check after some time or verify the OpenAI key.',
        'Close',
        {
          horizontalPosition: 'end',
          verticalPosition: 'bottom',
          duration: 5000,
        }
      );
    }

    this.chatService.setMessagesSubject(this.messages);
    this.isBusy = false;
    this.scrollToBottom();
  }


  // 捕獲到輸入框事件（開始）
  onCompositionStart() {
    this.isComposing = true; // 開始選字時設置為 true
  }


  // 捕獲到輸入框事件（結束）
  onCompositionEnd() {
    this.isComposing = false; // 選字結束時設置為 false
  }



  onEnterPress(event: KeyboardEvent, textInput: HTMLTextAreaElement) {
    if (event.key === 'Enter' && !this.isComposing) {
      event.preventDefault(); // 阻止預設的 enter 行為
      this.createCompletion(textInput);
    };
  }



  // 取得高亮處理後的全文
  parseApiResponse(response: string) {
    // 正則表達式：用三個反引號包裹的程式碼片段
    //            - 捕獲組1：程式語言
    //            - 捕獲組2：程式碼內容
    const codeRegex = /```(\w+)?\s*([\s\S]*?)```/g;

    // 將api response所有程式碼片段，替換為高亮處理後的HTML
    let parsedContent = response.replace(codeRegex, (
      match,      // 匹配到的整個程式碼片段
      language,   // 捕獲組1，程式語言
      code        // 捕獲組2，程式碼內容
    ) => {
      // 預設程式語言
      language = language || 'plaintext';

      // 將補獲到的程式碼片段進行高亮處理
      const highlightedCode = this.highlightCode(code, language);

      return `<pre><code class="${language}">${highlightedCode}</code></pre>`;
    });

    return parsedContent;
  }



  // 程式碼片段實際進行高亮處理
  highlightCode(code: string, language: string): string {
    // 檢查highlightJS套件是否支援該程式語言的高亮處理
    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';

    // 返回高亮後的程式碼
    return hljs.highlight(code, { language: validLanguage }).value;
  }



  scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
  }
}
