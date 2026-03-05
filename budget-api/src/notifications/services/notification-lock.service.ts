import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationLock } from '../entities/notification-lock.entity';
import * as os from 'os';

@Injectable()
export class NotificationLockService {
  private readonly logger: Logger = new Logger(NotificationLockService.name);
  private readonly instanceId: string;

  constructor(
    @InjectModel(NotificationLock.name)
    private readonly lockModel: Model<NotificationLock>,
  ) {
    this.instanceId = `${os.hostname()}-${process.pid}`;
  }

  async acquireLock(
    jobName: string,
    ttlMinutes: number = 30,
  ): Promise<boolean> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

      const result = await this.lockModel.findOneAndUpdate(
        {
          jobName,
          $or: [{ expiresAt: { $lt: now } }, { expiresAt: { $exists: false } }],
        },
        {
          $set: {
            jobName,
            lockedAt: now,
            lockedBy: this.instanceId,
            expiresAt,
          },
        },
        { upsert: true, new: true },
      );

      return result?.lockedBy === this.instanceId;
    } catch (error) {
      // Duplicate key error means another instance acquired the lock
      if (error.code === 11000) {
        return false;
      }
      this.logger.error(
        `Failed to acquire lock for ${jobName}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async releaseLock(jobName: string): Promise<void> {
    try {
      await this.lockModel.deleteOne({
        jobName,
        lockedBy: this.instanceId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to release lock for ${jobName}: ${error.message}`,
        error.stack,
      );
    }
  }
}
