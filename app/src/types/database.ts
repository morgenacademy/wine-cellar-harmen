export type Location = {
  id: string
  name: string
  type: 'kast' | 'rek' | 'koelkast' | 'kistje'
  sort_order: number
}

export type Slot = {
  id: string
  location_id: string
  position: number
  capacity: number
  label: string | null
  row_index: number | null
  col_index: number | null
}

export type Wine = {
  id: string
  name: string
  producer: string | null
  vintage: number | null
  color: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  country: string | null
  region: string | null
  subregion: string | null
  appellation: string | null
  varietal: string | null
  designation: string | null
  drink_from: number | null
  drink_until: number | null
  price: number | null
  estimated_value: number | null
  shop: string | null
  notes: string | null
  cellartracker_id: string | null
}

export type Bottle = {
  id: string
  wine_id: string
  slot_id: string | null
  added_at: string
  consumed_at: string | null
  pending: boolean
  consume_reason: 'drunk' | 'sold' | 'lost' | 'gifted' | null
}

// Joined types for queries
export type BottleWithWine = Bottle & { wine: Wine }
export type SlotWithBottles = Slot & { bottles: BottleWithWine[] }
export type LocationWithSlots = Location & { slots: SlotWithBottles[] }

export type Database = {
  public: {
    Tables: {
      locations: {
        Row: Location
        Insert: Omit<Location, 'id'>
        Update: Partial<Location>
        Relationships: []
      }
      slots: {
        Row: Slot
        Insert: Omit<Slot, 'id'>
        Update: Partial<Slot>
        Relationships: [
          {
            foreignKeyName: 'slots_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      wines: {
        Row: Wine
        Insert: Omit<Wine, 'id'>
        Update: Partial<Wine>
        Relationships: []
      }
      bottles: {
        Row: Bottle
        Insert: Omit<Bottle, 'id' | 'added_at' | 'consumed_at' | 'pending' | 'consume_reason'> & { added_at?: string; consumed_at?: string | null; pending?: boolean; consume_reason?: string | null }
        Update: Partial<Bottle>
        Relationships: [
          {
            foreignKeyName: 'bottles_wine_id_fkey'
            columns: ['wine_id']
            isOneToOne: false
            referencedRelation: 'wines'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bottles_slot_id_fkey'
            columns: ['slot_id']
            isOneToOne: false
            referencedRelation: 'slots'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
