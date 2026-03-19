import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  protected readonly savedLists = signal<any[]>([]);
  protected readonly isLoading = signal(false);

  ngOnInit() {
    this.loadLists();
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
    return new Date(dateStr).toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  calculateTotal(items: any[]) {
    return items.reduce((sum, item) => sum + (item.price || 0), 0);
  }
}