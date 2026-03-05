import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationDto } from './dto/notification.dto';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';
import { PaginatedDataDto } from 'src/shared/dto/paginated-data.dto';
import { NotificationType } from './entities/notification-type.enum';

@Injectable()
export class NotificationsService {
  private readonly logger: Logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    @InjectModel(NotificationPreference.name)
    private readonly notificationPreferenceModel: Model<NotificationPreference>,
  ) {}

  async create(
    dto: CreateNotificationDto,
    userId: string,
    workspaceId: string,
  ): Promise<NotificationDto> {
    try {
      const model = new this.notificationModel({
        ...dto,
        user: userId,
        workspace: workspaceId,
      });
      const saved = await model.save();
      return plainToInstance(NotificationDto, saved.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to create notification: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    userId: string,
    workspaceId: string,
    query: NotificationsQueryDto,
  ): Promise<PaginatedDataDto<NotificationDto>> {
    const filter: FilterQuery<Notification> = {
      user: userId,
      workspace: workspaceId,
    };
    const skip = query.offset || 0;
    const limit = query.limit || 20;

    if (query.type) {
      filter.type = query.type;
    }

    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }

    try {
      const [notifications, total] = await Promise.all([
        this.notificationModel.find(filter, null, {
          skip,
          limit,
          sort: { createdAt: -1 },
        }),
        this.notificationModel.countDocuments(filter),
      ]);

      return {
        data: notifications.map((n) =>
          plainToInstance(NotificationDto, n.toObject()),
        ),
        total,
        limit,
        offset: skip,
        nextPage: skip + limit < total ? skip + limit : null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find notifications: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding notifications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findUnreadCount(
    userId: string,
    workspaceId: string,
  ): Promise<{ count: number }> {
    try {
      const count = await this.notificationModel.countDocuments({
        user: userId,
        workspace: workspaceId,
        isRead: false,
      });
      return { count };
    } catch (error) {
      this.logger.error(
        `Failed to count unread notifications: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error counting unread notifications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async markAsRead(
    id: string,
    userId: string,
    workspaceId: string,
  ): Promise<NotificationDto> {
    try {
      const updated = await this.notificationModel.findOneAndUpdate(
        { _id: id, user: userId, workspace: workspaceId },
        { isRead: true, readAt: new Date() },
        { new: true },
      );
      if (!updated) {
        throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
      }
      return plainToInstance(NotificationDto, updated.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to mark notification as read: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error marking notification as read',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async markAllAsRead(
    userId: string,
    workspaceId: string,
  ): Promise<{ modifiedCount: number }> {
    try {
      const result = await this.notificationModel.updateMany(
        { user: userId, workspace: workspaceId, isRead: false },
        { isRead: true, readAt: new Date() },
      );
      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      this.logger.error(
        `Failed to mark all notifications as read: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error marking all notifications as read',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(
    id: string,
    userId: string,
    workspaceId: string,
  ): Promise<NotificationDto> {
    try {
      const deleted = await this.notificationModel.findOneAndDelete({
        _id: id,
        user: userId,
        workspace: workspaceId,
      });
      if (!deleted) {
        throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
      }
      return plainToInstance(NotificationDto, deleted.toObject());
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to remove notification: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error removing the notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPreferences(
    userId: string,
    workspaceId: string,
  ): Promise<NotificationPreferenceDto> {
    try {
      const prefs = await this.notificationPreferenceModel.findOneAndUpdate(
        { user: userId, workspace: workspaceId },
        {
          $setOnInsert: {
            user: userId,
            workspace: workspaceId,
          },
        },
        { upsert: true, new: true },
      );
      return plainToInstance(NotificationPreferenceDto, prefs.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to get notification preferences: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error getting notification preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updatePreferences(
    userId: string,
    workspaceId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceDto> {
    try {
      const updateFields: Record<string, unknown> = {};

      // Deep merge channels
      if (dto.channels) {
        for (const [key, value] of Object.entries(dto.channels)) {
          if (value.inApp !== undefined) {
            updateFields[`channels.${key}.inApp`] = value.inApp;
          }
          if (value.email !== undefined) {
            updateFields[`channels.${key}.email`] = value.email;
          }
        }
      }

      // Flat update thresholds and quiet hours
      if (dto.budgetThresholdPercent !== undefined) {
        updateFields.budgetThresholdPercent = dto.budgetThresholdPercent;
      }
      if (dto.largeTransactionAmount !== undefined) {
        updateFields.largeTransactionAmount = dto.largeTransactionAmount;
      }
      if (dto.lowBalanceAmount !== undefined) {
        updateFields.lowBalanceAmount = dto.lowBalanceAmount;
      }
      if (dto.billDueSoonDays !== undefined) {
        updateFields.billDueSoonDays = dto.billDueSoonDays;
      }
      if (dto.quietHoursEnabled !== undefined) {
        updateFields.quietHoursEnabled = dto.quietHoursEnabled;
      }
      if (dto.quietHoursStart !== undefined) {
        updateFields.quietHoursStart = dto.quietHoursStart;
      }
      if (dto.quietHoursEnd !== undefined) {
        updateFields.quietHoursEnd = dto.quietHoursEnd;
      }
      if (dto.quietHoursTimezone !== undefined) {
        updateFields.quietHoursTimezone = dto.quietHoursTimezone;
      }

      const updated = await this.notificationPreferenceModel.findOneAndUpdate(
        { user: userId, workspace: workspaceId },
        { $set: updateFields },
        { new: true, upsert: true },
      );

      return plainToInstance(NotificationPreferenceDto, updated.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to update notification preferences: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error updating notification preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteOldNotifications(
    retentionDays: number,
  ): Promise<{ deletedCount: number }> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      const result = await this.notificationModel.deleteMany({
        createdAt: { $lt: cutoff },
      });
      return { deletedCount: result.deletedCount };
    } catch (error) {
      this.logger.error(
        `Failed to delete old notifications: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error deleting old notifications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findDuplicateKey(
    userId: string,
    workspaceId: string,
    type: NotificationType,
    deduplicationKey: string,
  ): Promise<boolean> {
    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 24);

      const existing = await this.notificationModel.findOne({
        user: userId,
        workspace: workspaceId,
        type,
        'data.deduplicationKey': deduplicationKey,
        createdAt: { $gte: cutoff },
      });
      return !!existing;
    } catch (error) {
      this.logger.error(
        `Failed to check duplicate notification: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
