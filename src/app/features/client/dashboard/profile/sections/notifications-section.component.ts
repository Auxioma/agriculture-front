import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NotificationSettings } from '../profile.model';

@Component({
  selector: 'app-notifications-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="space-y-3 rounded-xl border border-grey-200 bg-white p-4">
      @for (item of items; track item.key) {
        <li class="flex items-center justify-between gap-3">
          <span class="text-sm">{{ item.label }}</span>
          <button
            type="button"
            role="switch"
            class="relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors"
            [class.bg-agri]="settings()[item.key]"
            [class.bg-grey-400]="!settings()[item.key]"
            [attr.aria-checked]="settings()[item.key]"
            [attr.aria-label]="item.label"
            (click)="toggle(item.key)"
          >
            <span
              class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
              [class.translate-x-4]="settings()[item.key]"
            ></span>
          </button>
        </li>
      }
    </ul>
  `,
})
export class NotificationsSectionComponent {
  readonly settings = input.required<NotificationSettings>();
  /** Émet uniquement la clé modifiée, ex. { newMessage: false } (correspond au PATCH). */
  readonly changed = output<Partial<NotificationSettings>>();

  readonly items: { key: keyof NotificationSettings; label: string }[] = [
    { key: 'producerReply', label: 'Nouvelle réponse producteur' },
    { key: 'newMessage', label: 'Nouveau message' },
    { key: 'requestExpiring', label: 'Demande expirant bientôt' },
  ];

  toggle(key: keyof NotificationSettings): void {
    this.changed.emit({ [key]: !this.settings()[key] } as Partial<NotificationSettings>);
  }
}
