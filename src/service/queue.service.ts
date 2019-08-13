import QueueServiceInterface from "../lib/interface/queue.service.interface";
import { Logger } from "log4js";
import { Channel, Connection, Options } from "amqplib";
import * as amqp from "amqplib";
import { SYS_ERR_NO_CHANNEL_QUEUE } from "../lib/constant/constants";

/**
 * QueueService is a service class that deals with AMQP server such as RabbitMQ
 */
export default class QueueService implements QueueServiceInterface {
  private channel: Channel;
  constructor (
      private readonly connectConf: Options.Connect,
      private readonly queue: string,
      private readonly logger: Logger,
  ) {
    this.connectConf = connectConf;
    this.queue = queue;
    this.logger = logger;
  }

  /**
   * Create channel with current configuration
   * @returns created channel if successful, else undefined
   */
  public async createChannel(callback: (connectConf: Options.Connect) => Promise<Connection>)
    : Promise<Channel|undefined> {
    let conn: Connection;
    let channel: Channel;
    try {
      conn = await callback(this.connectConf);
      channel = await conn.createChannel();
    } catch (err) {
      // TODO handle error
      this.logger.fatal(err);
      return undefined;
    }
    return channel;
  }

  /**
   * Get existing channel or create a new one if not exist yet
   * @returns existing or new channel
   */
  public async getChannel(): Promise<Channel|undefined>  {
    if (this.channel) return this.channel;
    let channel: Channel|undefined = await this.createChannel(amqp.connect);
    if (channel) this.channel = channel;
    return this.channel;
  }

  /**
   * Replace current channel with given channel
   * @param channel replacement channel object
   */
  public setChannel(channel: Channel): void {
    this.channel = channel;
  }

  /**
   * Put job id into target queue
   * @param jobId job id for the worker to consume
   * @returns true if sending job is successful else false
   */
  public async putJob(jobId: number): Promise<boolean> {
    let sendStatus: boolean = false;
    let channel: Channel|undefined;

    this.logger.info(`getting available channel for sending message`);
    channel = await this.getChannel();
    if (!channel) {
      this.logger.error(SYS_ERR_NO_CHANNEL_QUEUE);
      return false;
    }
    try {
      this.logger.info(`creating queue if not exists: ${this.queue}`);
      await channel.assertQueue(this.queue);
      this.logger.info(`trying to send job: ${jobId} into queue ${this.queue}`);
      sendStatus = channel.sendToQueue(this.queue, Buffer.from(String(jobId)));
    } catch (err) {
      // TODO handle error
      this.logger.error(err);
      return false;
    }
    return sendStatus;
  }
}