import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { RouterLink } from '@angular/router';
import { UIStore } from '../../services/ui-store';
import { IconComponent } from '../icon/icon';
import { RegionSelectorComponent } from '../region-selector/region-selector';
import { SavedListCardComponent } from '../saved-list-card/saved-list-card';
import { SavedList, Region } from '../../models/types';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    IconComponent,
    RegionSelectorComponent,
    SavedListCardComponent,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  public readonly ui = inject(UIStore);
  private api = inject(ApiService);
  protected readonly savedLists = signal<SavedList[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly regions = signal<Region[]>([]);
  protected readonly currencySymbol = computed(
    () => this.ui.activeRegion()?.currency?.symbol ?? '$',
  );

  ngOnInit() {
    this.loadLists();
    this.api.getRegions().subscribe({
      next: (regions) => this.regions.set(regions),
    });
  }

  changeRegion(regionId: string) {
    const region = this.regions().find((r: Region) => r.id === regionId);
    if (!region) return;
    this.ui.setRegion(region);
    this.api.updateUserRegion(regionId).subscribe({
      error: (err) => console.warn('Could not save region preference:', err.message),
    });
  }

  loadLists() {
    this.isLoading.set(true);
    this.api.getSavedLists().subscribe({
      next: (lists) => {
        // Parse items if they are stored as JSON string in SQL
        const formattedLists = lists.map((list) => ({
          ...list,
          // Handle potential serialized JSON from legacy backend
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
}
