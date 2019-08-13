import {Channel, Connection, Options} from "amqplib";

export default interface QueueServiceInterface {
  putJob(jobId: number): Promise<boolean>;
  getChannel(): Promise<Channel|undefined>;
  setChannel(channel: Channel): void;
  createChannel(callback: (connectConf: Options.Connect) => Promise<Connection>)
      : Promise<Channel|undefined>
}