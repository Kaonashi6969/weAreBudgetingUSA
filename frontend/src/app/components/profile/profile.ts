import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { RouterLink } from '@angular/router';
import { uiStore } from '../../services/ui-store';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  protected readonly ui = uiStore;
  protected readonly savedLists = signal<any[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly regions = signal<any[]>([]);
  protected readonly currencySymbol = computed(() => this.ui.activeRegion()?.currency?.symbol ?? '$');

  ngOnInit() {
    this.loadLists();
    this.api.getRegions().subscribe({
      next: (regions) => this.regions.set(regions)
    });
  }

  changeRegion(regionId: string) {
    const region = this.regions().find((r: any) => r.id === regionId);
    if (!region) return;
    this.ui.setRegion(region);
    this.api.updateUserRegion(regionId).subscribe({
      error: (err) => console.warn('Could not save region preference:', err.message)
    });
  }

  loadLists() {
    this.isLoading.set(true);
    this.api.getSavedLists().subscribe({
      next: (lists) => {
        // Parse items if they are stored as JSON string in SQL
        const formattedLists = lists.map(list => ({
          ...list,
          items: typeof list.items === 'string' ? JSON.parse(list.items) : list.items
        }));
        this.savedLists.set(formattedLists);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading lists:', err);
        this.isLoading.set(false);
      }
    });
  }

  deleteList(id: number) {
    if (confirm('Are you sure you want to delete this list?')) {
      this.api.deleteList(id).subscribe(() => {
        this.loadLists();
      });
    }
  }

  formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  calculateTotal(items: any[]) {
    return items.reduce((sum, item) => sum + (item.price || 0), 0);
  }
}