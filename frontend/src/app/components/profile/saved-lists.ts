import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { RouterLink } from '@angular/router';
import { UIStore } from '../../services/ui-store';
import { IconComponent } from '../icon/icon';
import { SavedListCardComponent } from '../saved-list-card/saved-list-card';
import { SavedList, SavedListItem } from '../../models/types';

@Component({
  selector: 'app-saved-lists',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent, SavedListCardComponent],
  templateUrl: './saved-lists.html',
  styleUrl: './saved-lists.scss',
})
export class SavedListsComponent implements OnInit {
  public readonly ui = inject(UIStore);
  private api = inject(ApiService);
  protected readonly savedLists = signal<SavedList[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly savingId = signal<number | null>(null);
  protected readonly currencySymbol = computed(
    () => this.ui.activeRegion()?.currency?.symbol ?? '$',
  );

  ngOnInit() {
    this.loadLists();
  }

  loadLists() {
    this.isLoading.set(true);
    this.api.getSavedLists().subscribe({
      next: (lists) => {
        const formattedLists = lists.map((list) => ({
          ...list,
          items:
            typeof (list as unknown as { items: string }).items === 'string'
              ? JSON.parse((list as unknown as { items: string }).items)
              : list.items,
        }));
        this.savedLists.set(formattedLists);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading lists:', err);
        this.isLoading.set(false);
      },
    });
  }

  deleteList(id: number) {
    if (confirm('Are you sure you want to delete this list?')) {
      this.api.deleteList(id).subscribe(() => {
        this.loadLists();
      });
    }
  }

  saveEdit(event: { id: number; name: string; items: SavedListItem[] }) {
    this.savingId.set(event.id);
    this.api.updateList(event.id, event.name, event.items).subscribe({
      next: () => {
        this.savingId.set(null);
        this.loadLists();
      },
      error: () => this.savingId.set(null),
    });
  }
}
