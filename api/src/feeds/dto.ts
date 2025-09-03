export class CreateFeedDto {
  collectionId: number;
  title: string;
  url: string;
  description?: string;
  category?: string;
  updateFreq?: string; // "hourly" | "6h" | "daily" | etc.
  status?: 'ACTIVE' | 'INACTIVE';
}

export class UpdateFeedDto {
  title?: string;
  description?: string;
  category?: string;
  updateFreq?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}
