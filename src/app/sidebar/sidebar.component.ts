import { Component, OnInit } from '@angular/core';
import { ChatDataService } from '../services/chat-data.service';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from '../services/chat.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';
import { ApiKeyService } from '../services/api-key.service';
import { ChatHistoryDetails } from '../shared/models/chat-history-details.model';
import ChatHistories from '../shared/models/chat-histories.model';
import { ChatCompletionRequestMessage } from 'openai';
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  constructor(
    private chatDataService: ChatDataService,
    private chatService: ChatService,
    private dialogModel: MatDialog,
    private apiKeyService: ApiKeyService
  ) { }

  messages: ChatCompletionRequestMessage[] = [];
  chatHistories: ChatHistories = {
    chatHistoryDetails: [],
  };
  userDialogBox!: MatDialogRef<UserDialogComponent>;
  apiKey: string = '';
  isHistoricalChat: boolean = false;


  ngOnInit(): void {
    // Subscribe to messages(全部的歷史訊息)
    this.chatService.getMessagesSubject().subscribe((messages) => {
      this.messages = messages;
      console.log('初始化-sidebar:messages', messages);
    });

    this.chatHistories = this.getCurrentChatHistoriesFromLocalStorage();
  }

  async addNewChat() {
    if ((this.messages.length > 0)) {
      if ((this.isHistoricalChat === false)) {
        console.log('addNewChat', this.messages);
        const chatHistoryId = uuidv4();
        // // 原作者貌似多打了一次API
        // let chatCompletionRequestMessage = await this.chatService.createCompletionViaOpenAI(this.messages);

        const title = this.messages[0]?.content;
        const modelNameViewInWeb = ChatService.currentChatModelName;

        const chatHistory: ChatHistoryDetails = {
          id: chatHistoryId,
          messages: this.messages,
          title: title,
          modelNameViewInWeb: modelNameViewInWeb,
        };

        this.chatHistories = this.getCurrentChatHistoriesFromLocalStorage();

        if (this.checkIsChatHistoryExists(chatHistory.id) === false) {
          this.chatHistories.chatHistoryDetails.unshift(chatHistory);

          this.setChatHistoriesToLocalStorage(this.chatHistories);
        };
      };
      this.chatService.setMessagesSubject([]);
      this.isHistoricalChat = false;

    } else {
      location.reload();
    };
  }

  getHistoryChatMessages(id: string) {
    const history = this.chatHistories.chatHistoryDetails.find(
      (c) => c.id === id
    );
    console.log('history', history);
    ChatService.currentChatModelName = history?.modelNameViewInWeb!;

    if (history) {
      this.chatService.setMessagesSubject(history.messages);
      this.isHistoricalChat = true;
    };
  };

  getCurrentChatHistoriesFromLocalStorage(): ChatHistories {
    const currentHistories = localStorage.getItem('chatHistories');

    if (currentHistories) {
      const histories = JSON.parse(currentHistories) as ChatHistories;
      return {
        chatHistoryDetails: histories.chatHistoryDetails,
      };
    }

    return {
      chatHistoryDetails: [],
    };
  }

  setChatHistoriesToLocalStorage(chatHistories: ChatHistories) {
    localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
  }

  deleteHistoricalChat(id: string) {
    this.chatHistories.chatHistoryDetails =
      this.chatHistories.chatHistoryDetails.filter((c) => c.id !== id);

    this.setChatHistoriesToLocalStorage(this.chatHistories);
  }

  dialog() {
    const dialogRef = this.dialogModel.open(UserDialogComponent, {
      data: {
        message:
          "It's not stored in our end, it's only available in your browser localStorage",
        title: 'Please enter your API key',
      },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.apiKey = result.apiKey;

        // Emit the api key event with new api key.
        this.apiKeyService.setApiKey(this.apiKey);

        this.chatService.updateConfiguration();
      }
      this.chatDataService.setAPIKeyToLocalStore(this.apiKey);
    });
  }

  private checkIsChatHistoryExists(id: string) {
    const result = this.chatHistories.chatHistoryDetails.some(
      (c) => c.id === id
    );
    console.log(result);
    return result;
  }
}
