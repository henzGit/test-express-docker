import * as events from "events";
import {
  Channel, Connection, ConsumeMessage, GetMessage,
  Message, Options, Replies, ConfirmChannel, ServerProperties
} from "amqplib";
// @ts-ignore
import * as Promise from "bluebird";

export default class ChannelMock extends events.EventEmitter implements Channel  {
  close(): Promise<void> {
    return new Promise(()=>{});
  }
  assertQueue(queue: string, options?: Options.AssertQueue):
      Promise<Replies.AssertQueue> {
    const assertQueue: Replies.AssertQueue = {
      queue: queue,
      messageCount: 1,
      consumerCount: 1
    };
    return Promise.props((assertQueue));
  }
  checkQueue(queue: string): Promise<Replies.AssertQueue> {
    return new Promise(()=>{});
  }
  deleteQueue(queue: string, options?: Options.DeleteQueue):
      Promise<Replies.DeleteQueue> {
    return new Promise(()=>{});
  }
  purgeQueue(queue: string): Promise<Replies.PurgeQueue> {
    return new Promise(()=>{});
  }
  bindQueue(queue: string, source: string, pattern: string, args?: any):
      Promise<Replies.Empty> {
    return new Promise(()=>{});
  }
  unbindQueue(queue: string, source: string, pattern: string, args?: any):
      Promise<Replies.Empty> {
    return new Promise(()=>{});
  }
  assertExchange(exchange: string, type: string, options?: Options.AssertExchange):
      Promise<Replies.AssertExchange> {
    return new Promise(()=>{});
  }
  checkExchange(exchange: string): Promise<Replies.Empty> {
    return new Promise(()=>{});
  }
  deleteExchange(exchange: string, options?: Options.DeleteExchange):
      Promise<Replies.Empty> {
    return new Promise(()=>{});
  }
  bindExchange(destination: string, source: string, pattern: string, args?: any):
      Promise<Replies.Empty> {
    return new Promise(()=>{});
  }
  unbindExchange(destination: string, source: string, pattern: string, args?: any):
      Promise<Replies.Empty> {
    return new Promise(()=>{});
  }
  publish(exchange: string, routingKey: string, content: Buffer, options?: Options.Publish):
      boolean {
    return true;
  }
  sendToQueue(queue: string, content: Buffer, options?: Options.Publish): boolean {
    return true;
  }
  consume(queue: string, onMessage: (msg: ConsumeMessage | null)
      => any, options?: Options.Consume): Promise<Replies.Consume> {
    return new Promise(()=>{});
  }
  cancel(consumerTag: string): Promise<Replies.Empty> {
    return new Promise(()=>{});
  }
  get(queue: string, options?: Options.Get): Promise<GetMessage | false> {
    return new Promise(()=>{});
  }
  ack(message: Message, allUpTo?: boolean): void {}
  ackAll(): void {}
  nack(message: Message, allUpTo?: boolean, requeue?: boolean): void {}
  nackAll(requeue?: boolean): void {}
  reject(message: Message, requeue?: boolean): void {}
  prefetch(count: number, global?: boolean): Promise<Replies.Empty> {
    return new Promise(()=>{});
  }
  recover(): Promise<Replies.Empty> {
    return new Promise(()=>{});
  }
}

export class ConnectionMock extends events.EventEmitter implements Connection{
  serverProperties: ServerProperties;
  close(): Promise<void> {
    return new Promise(()=>{});
  }
  createChannel(): Promise<Channel> {
    const channelMock: Channel = new ChannelMock();
    return Promise.cast(channelMock);
  }
  createConfirmChannel(): Promise<ConfirmChannel> {
    return new Promise(()=>{});
  }
}

export function amqpConnectMockSuccess(connectConf: Options.Connect)
    : Promise<Connection> {
  const connMock: Connection = new ConnectionMock();
  return Promise.cast(connMock);
}

export function amqpConnectMockFailed(connectConf: Options.Connect)
    : Promise<Connection> {
  const connMock: Connection = new ConnectionMock();
  return Promise.props(connMock);
}