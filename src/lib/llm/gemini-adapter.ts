/*import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

export class GeminiAdapter {
  private model: any;
  private temperature: number;

  constructor(options: { 
    apiKey: string;
    modelName?: string;
    temperature?: number;
  }) {
    if (!options.apiKey) {
      throw new Error('Gemini API key is required');
    }

    const genAI = new GoogleGenerativeAI(options.apiKey);

    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-pro'  
    });
    this.temperature = options.temperature || 0.7;
  }

 
  private formatMessages(messages: BaseMessage[]): string {
    return messages.map(msg => {
      if (msg instanceof SystemMessage) {
        return `System: ${msg.content}`;
      } else if (msg instanceof HumanMessage) {
        return `Human: ${msg.content}`;
      }
      return msg.content;
    }).join('\n');
  }

 
  async invoke(messages: BaseMessage[]): Promise<BaseMessage> {
    try {
      const prompt = this.formatMessages(messages);

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.temperature,
        },
      });

      if (!result.response) {
        throw new Error('No response from Gemini API');
      }

      return new HumanMessage(result.response.text());
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new Error(`Failed to get response from Gemini: ${error.message}`);
    }
  }

 
  async stream(messages: BaseMessage[]): Promise<AsyncGenerator<string>> {
    try {
      const prompt = this.formatMessages(messages);

      const result = await this.model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.temperature,
        },
      });

      return (async function* () {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              yield text;
            }
          }
        } catch (error: any) {
          console.error('Error in Gemini stream:', error);
          throw new Error(`Streaming failed: ${error.message}`);
        }
      })();
    } catch (error: any) {
      console.error('Error starting Gemini stream:', error);
      throw new Error(`Failed to start streaming: ${error.message}`);
    }
  }
} 

*/

import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

export class GeminiAdapter {
  private model: any;
  private temperature: number;

  constructor(options: {
    apiKey: string;
    modelName?: string;
    temperature?: number;
  }) {
    if (!options.apiKey) {
      throw new Error('Gemini API key is required');
    }

    const genAI = new GoogleGenerativeAI(options.apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
    this.temperature = options.temperature || 0.7;
  }

  private formatMessages(messages: BaseMessage[]): string {
    return messages.map(msg => {
      if (msg instanceof SystemMessage) {
        return `System: ${msg.content}`;
      }
      return `Human: ${msg.content}`;
    }).join('\n\n');
  }

  async invoke(messages: BaseMessage[]): Promise<BaseMessage> {
    try {
      const prompt = this.formatMessages(messages);

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.temperature,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });

      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('No response from Gemini API');
      }

      return new HumanMessage(text);
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new Error(`Failed to get response from Gemini: ${error.message}`);
    }
  }

  async *stream(messages: BaseMessage[]): AsyncGenerator<string> {
    try {
      const prompt = this.formatMessages(messages);

      const result = await this.model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.temperature,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new Error(`Failed to get response from Gemini: ${error.message}`);
    }
  }
}