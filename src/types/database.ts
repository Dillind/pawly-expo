export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      alert_reads: {
        Row: {
          alert_id: string;
          read_at: string;
          user_id: string;
        };
        Insert: {
          alert_id: string;
          read_at?: string;
          user_id: string;
        };
        Update: {
          alert_id?: string;
          read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'alert_reads_alert_id_fkey';
            columns: ['alert_id'];
            isOneToOne: false;
            referencedRelation: 'alerts';
            referencedColumns: ['id'];
          }
        ];
      };
      alerts: {
        Row: {
          actor_id: string | null;
          created_at: string;
          dispatch_attempts: number;
          error: string | null;
          household_id: string | null;
          id: string;
          kind: Database['public']['Enums']['alert_kind'];
          last_dispatch_at: string | null;
          lead_minutes: number | null;
          recipient_id: string | null;
          sent_at: string | null;
          subject_at: string | null;
          subject_date: string | null;
          subject_id: string;
          suppressed_reason: string | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          dispatch_attempts?: number;
          error?: string | null;
          household_id?: string | null;
          id?: string;
          kind: Database['public']['Enums']['alert_kind'];
          last_dispatch_at?: string | null;
          lead_minutes?: number | null;
          recipient_id?: string | null;
          sent_at?: string | null;
          subject_at?: string | null;
          subject_date?: string | null;
          subject_id: string;
          suppressed_reason?: string | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          dispatch_attempts?: number;
          error?: string | null;
          household_id?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['alert_kind'];
          last_dispatch_at?: string | null;
          lead_minutes?: number | null;
          recipient_id?: string | null;
          sent_at?: string | null;
          subject_at?: string | null;
          subject_date?: string | null;
          subject_id?: string;
          suppressed_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'alerts_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      breeds: {
        Row: {
          id: string;
          is_active: boolean;
          name: string;
          species: Database['public']['Enums']['breed_species'];
        };
        Insert: {
          id: string;
          is_active?: boolean;
          name: string;
          species: Database['public']['Enums']['breed_species'];
        };
        Update: {
          id?: string;
          is_active?: boolean;
          name?: string;
          species?: Database['public']['Enums']['breed_species'];
        };
        Relationships: [];
      };
      care_card_contacts: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          pet_id: string;
          phone: string | null;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          pet_id: string;
          phone?: string | null;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          pet_id?: string;
          phone?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'care_card_contacts_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          }
        ];
      };
      care_card_medications: {
        Row: {
          created_at: string;
          dose: string | null;
          id: string;
          instructions: string | null;
          name: string;
          pet_id: string;
          schedule_text: string | null;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          dose?: string | null;
          id?: string;
          instructions?: string | null;
          name: string;
          pet_id: string;
          schedule_text?: string | null;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          dose?: string | null;
          id?: string;
          instructions?: string | null;
          name?: string;
          pet_id?: string;
          schedule_text?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'care_card_medications_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          }
        ];
      };
      care_cards: {
        Row: {
          allergies: string | null;
          behaviour_notes: string | null;
          emergency_vet_name: string | null;
          emergency_vet_phone: string | null;
          feeding_notes: string | null;
          insurance_policy_number: string | null;
          insurance_provider: string | null;
          microchip_number: string | null;
          notes: string | null;
          pet_id: string;
          updated_at: string;
          vet_name: string | null;
          vet_phone: string | null;
          walk_routine: string | null;
          where_things_are: string | null;
        };
        Insert: {
          allergies?: string | null;
          behaviour_notes?: string | null;
          emergency_vet_name?: string | null;
          emergency_vet_phone?: string | null;
          feeding_notes?: string | null;
          insurance_policy_number?: string | null;
          insurance_provider?: string | null;
          microchip_number?: string | null;
          notes?: string | null;
          pet_id: string;
          updated_at?: string;
          vet_name?: string | null;
          vet_phone?: string | null;
          walk_routine?: string | null;
          where_things_are?: string | null;
        };
        Update: {
          allergies?: string | null;
          behaviour_notes?: string | null;
          emergency_vet_name?: string | null;
          emergency_vet_phone?: string | null;
          feeding_notes?: string | null;
          insurance_policy_number?: string | null;
          insurance_provider?: string | null;
          microchip_number?: string | null;
          notes?: string | null;
          pet_id?: string;
          updated_at?: string;
          vet_name?: string | null;
          vet_phone?: string | null;
          walk_routine?: string | null;
          where_things_are?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'care_cards_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: true;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          }
        ];
      };
      comment_likes: {
        Row: {
          comment_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comment_likes_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'post_comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comment_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      crumpet_team: {
        Row: {
          user_id: string;
        };
        Insert: {
          user_id: string;
        };
        Update: {
          user_id?: string;
        };
        Relationships: [];
      };
      feature_board_bans: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      feature_request_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      feature_request_reports: {
        Row: {
          created_at: string;
          reporter_id: string;
          request_id: string;
        };
        Insert: {
          created_at?: string;
          reporter_id: string;
          request_id: string;
        };
        Update: {
          created_at?: string;
          reporter_id?: string;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feature_request_reports_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'feature_requests';
            referencedColumns: ['id'];
          }
        ];
      };
      feature_request_votes: {
        Row: {
          created_at: string;
          request_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          request_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          request_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feature_request_votes_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'feature_requests';
            referencedColumns: ['id'];
          }
        ];
      };
      feature_requests: {
        Row: {
          author_id: string;
          created_at: string;
          description: string | null;
          hidden_at: string | null;
          id: string;
          status: Database['public']['Enums']['feature_request_status'];
          title: string;
          vote_count: number;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          description?: string | null;
          hidden_at?: string | null;
          id?: string;
          status?: Database['public']['Enums']['feature_request_status'];
          title: string;
          vote_count?: number;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          description?: string | null;
          hidden_at?: string | null;
          id?: string;
          status?: Database['public']['Enums']['feature_request_status'];
          title?: string;
          vote_count?: number;
        };
        Relationships: [];
      };
      feed_logs: {
        Row: {
          created_at: string;
          feed_time_series_id: string | null;
          id: string;
          logged_at: string;
          logged_by: string | null;
          notes: string | null;
          occurrence_date: string | null;
          pet_id: string;
        };
        Insert: {
          created_at?: string;
          feed_time_series_id?: string | null;
          id?: string;
          logged_at?: string;
          logged_by?: string | null;
          notes?: string | null;
          occurrence_date?: string | null;
          pet_id: string;
        };
        Update: {
          created_at?: string;
          feed_time_series_id?: string | null;
          id?: string;
          logged_at?: string;
          logged_by?: string | null;
          notes?: string | null;
          occurrence_date?: string | null;
          pet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feed_logs_logged_by_fkey';
            columns: ['logged_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feed_logs_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          }
        ];
      };
      feed_times: {
        Row: {
          created_at: string;
          days_of_week: number[];
          effective: unknown;
          id: string;
          instructions: string | null;
          label: Database['public']['Enums']['feeding_schedule_label'];
          local_time: string;
          pet_id: string;
          series_id: string;
        };
        Insert: {
          created_at?: string;
          days_of_week?: number[];
          effective: unknown;
          id?: string;
          instructions?: string | null;
          label: Database['public']['Enums']['feeding_schedule_label'];
          local_time: string;
          pet_id: string;
          series_id?: string;
        };
        Update: {
          created_at?: string;
          days_of_week?: number[];
          effective?: unknown;
          id?: string;
          instructions?: string | null;
          label?: Database['public']['Enums']['feeding_schedule_label'];
          local_time?: string;
          pet_id?: string;
          series_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feed_times_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          }
        ];
      };
      household_follows: {
        Row: {
          follower_id: string;
          household_id: string;
          id: string;
          requested_at: string;
          responded_at: string | null;
          responded_by: string | null;
          status: Database['public']['Enums']['follow_status'];
        };
        Insert: {
          follower_id: string;
          household_id: string;
          id?: string;
          requested_at?: string;
          responded_at?: string | null;
          responded_by?: string | null;
          status?: Database['public']['Enums']['follow_status'];
        };
        Update: {
          follower_id?: string;
          household_id?: string;
          id?: string;
          requested_at?: string;
          responded_at?: string | null;
          responded_by?: string | null;
          status?: Database['public']['Enums']['follow_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'household_follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'household_follows_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'household_follows_responded_by_fkey';
            columns: ['responded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      household_invites: {
        Row: {
          accepted_at: string | null;
          code: string;
          created_at: string;
          email: string;
          expires_at: string;
          household_id: string;
          id: string;
          invited_by: string | null;
          invitee_user_id: string | null;
          role: Database['public']['Enums']['household_role'];
          status: Database['public']['Enums']['invite_status'];
        };
        Insert: {
          accepted_at?: string | null;
          code: string;
          created_at?: string;
          email: string;
          expires_at?: string;
          household_id: string;
          id?: string;
          invited_by?: string | null;
          invitee_user_id?: string | null;
          role?: Database['public']['Enums']['household_role'];
          status?: Database['public']['Enums']['invite_status'];
        };
        Update: {
          accepted_at?: string | null;
          code?: string;
          created_at?: string;
          email?: string;
          expires_at?: string;
          household_id?: string;
          id?: string;
          invited_by?: string | null;
          invitee_user_id?: string | null;
          role?: Database['public']['Enums']['household_role'];
          status?: Database['public']['Enums']['invite_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'household_invites_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'household_invites_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      household_members: {
        Row: {
          created_at: string;
          feed_due_alerts: boolean;
          feed_due_lead_minutes: number;
          feed_logged_alerts: boolean;
          household_id: string;
          id: string;
          missed_feed_alerts: boolean;
          post_alerts: boolean;
          posts_last_seen_at: string | null;
          reminder_alerts: boolean;
          role: Database['public']['Enums']['household_role'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          feed_due_alerts?: boolean;
          feed_due_lead_minutes?: number;
          feed_logged_alerts?: boolean;
          household_id: string;
          id?: string;
          missed_feed_alerts?: boolean;
          post_alerts?: boolean;
          posts_last_seen_at?: string | null;
          reminder_alerts?: boolean;
          role: Database['public']['Enums']['household_role'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          feed_due_alerts?: boolean;
          feed_due_lead_minutes?: number;
          feed_logged_alerts?: boolean;
          household_id?: string;
          id?: string;
          missed_feed_alerts?: boolean;
          post_alerts?: boolean;
          posts_last_seen_at?: string | null;
          reminder_alerts?: boolean;
          role?: Database['public']['Enums']['household_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      households: {
        Row: {
          created_at: string;
          grace_window_minutes: number;
          handle: string | null;
          id: string;
          is_listed: boolean;
          name: string;
          timezone: string;
        };
        Insert: {
          created_at?: string;
          grace_window_minutes?: number;
          handle?: string | null;
          id?: string;
          is_listed?: boolean;
          name: string;
          timezone: string;
        };
        Update: {
          created_at?: string;
          grace_window_minutes?: number;
          handle?: string | null;
          id?: string;
          is_listed?: boolean;
          name?: string;
          timezone?: string;
        };
        Relationships: [];
      };
      occasions: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          emoji: string | null;
          household_id: string;
          id: string;
          label: string | null;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          emoji?: string | null;
          household_id: string;
          id?: string;
          label?: string | null;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          emoji?: string | null;
          household_id?: string;
          id?: string;
          label?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'occasions_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      pet_pauses: {
        Row: {
          created_at: string;
          during: unknown;
          id: string;
          pet_id: string;
          reason: string | null;
        };
        Insert: {
          created_at?: string;
          during: unknown;
          id?: string;
          pet_id: string;
          reason?: string | null;
        };
        Update: {
          created_at?: string;
          during?: unknown;
          id?: string;
          pet_id?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pet_pauses_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          }
        ];
      };
      pet_photos: {
        Row: {
          created_at: string;
          id: string;
          pet_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          pet_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          pet_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pet_photos_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          }
        ];
      };
      pets: {
        Row: {
          bio: string | null;
          birthdate: string | null;
          birthdate_is_approximate: boolean;
          breed: string | null;
          breed_freetext: string | null;
          breed_id: string | null;
          created_at: string;
          household_id: string;
          id: string;
          name: string;
          pet_type: Database['public']['Enums']['pet_type'];
          photo_url: string | null;
          sex: Database['public']['Enums']['pet_sex'] | null;
        };
        Insert: {
          bio?: string | null;
          birthdate?: string | null;
          birthdate_is_approximate?: boolean;
          breed?: string | null;
          breed_freetext?: string | null;
          breed_id?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          name: string;
          pet_type?: Database['public']['Enums']['pet_type'];
          photo_url?: string | null;
          sex?: Database['public']['Enums']['pet_sex'] | null;
        };
        Update: {
          bio?: string | null;
          birthdate?: string | null;
          birthdate_is_approximate?: boolean;
          breed?: string | null;
          breed_freetext?: string | null;
          breed_id?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          name?: string;
          pet_type?: Database['public']['Enums']['pet_type'];
          photo_url?: string | null;
          sex?: Database['public']['Enums']['pet_sex'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pets_breed_id_fkey';
            columns: ['breed_id'];
            isOneToOne: false;
            referencedRelation: 'breeds';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pets_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      post_comments: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          parent_comment_id: string | null;
          post_id: string;
          reply_to_user_id: string | null;
        };
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          parent_comment_id?: string | null;
          post_id: string;
          reply_to_user_id?: string | null;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          parent_comment_id?: string | null;
          post_id?: string;
          reply_to_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'post_comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_comments_parent_comment_id_fkey';
            columns: ['parent_comment_id'];
            isOneToOne: false;
            referencedRelation: 'post_comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_comments_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_comments_reply_to_user_id_fkey';
            columns: ['reply_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      post_likes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_likes_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      post_pets: {
        Row: {
          pet_id: string;
          post_id: string;
        };
        Insert: {
          pet_id: string;
          post_id: string;
        };
        Update: {
          pet_id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_pets_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_pets_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          }
        ];
      };
      post_photos: {
        Row: {
          created_at: string;
          id: string;
          post_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          post_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          post_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_photos_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          }
        ];
      };
      posts: {
        Row: {
          author_id: string | null;
          caption: string | null;
          created_at: string;
          edited_at: string | null;
          household_id: string;
          id: string;
          occasion_id: string | null;
          occurred_at: string;
          title: string | null;
        };
        Insert: {
          author_id?: string | null;
          caption?: string | null;
          created_at?: string;
          edited_at?: string | null;
          household_id: string;
          id?: string;
          occasion_id?: string | null;
          occurred_at?: string;
          title?: string | null;
        };
        Update: {
          author_id?: string | null;
          caption?: string | null;
          created_at?: string;
          edited_at?: string | null;
          household_id?: string;
          id?: string;
          occasion_id?: string | null;
          occurred_at?: string;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_occasion_id_fkey';
            columns: ['occasion_id'];
            isOneToOne: false;
            referencedRelation: 'occasions';
            referencedColumns: ['id'];
          }
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          last_seen_at: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          last_seen_at?: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          last_seen_at?: string;
          platform?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reminder_completions: {
        Row: {
          done_at: string;
          done_by: string | null;
          id: string;
          occurrence_date: string;
          reminder_id: string;
        };
        Insert: {
          done_at?: string;
          done_by?: string | null;
          id?: string;
          occurrence_date: string;
          reminder_id: string;
        };
        Update: {
          done_at?: string;
          done_by?: string | null;
          id?: string;
          occurrence_date?: string;
          reminder_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminder_completions_reminder_id_fkey';
            columns: ['reminder_id'];
            isOneToOne: false;
            referencedRelation: 'reminders';
            referencedColumns: ['id'];
          }
        ];
      };
      reminders: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          kind: Database['public']['Enums']['reminder_kind'];
          lead_days: number;
          local_time: string;
          pet_id: string;
          repeat: Database['public']['Enums']['reminder_repeat'];
          starts_on: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          kind: Database['public']['Enums']['reminder_kind'];
          lead_days?: number;
          local_time: string;
          pet_id: string;
          repeat?: Database['public']['Enums']['reminder_repeat'];
          starts_on: string;
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['reminder_kind'];
          lead_days?: number;
          local_time?: string;
          pet_id?: string;
          repeat?: Database['public']['Enums']['reminder_repeat'];
          starts_on?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          }
        ];
      };
      travel_checklist_items: {
        Row: {
          checklist_id: string;
          created_at: string;
          emoji: string | null;
          id: string;
          is_ticked: boolean;
          pet_id: string | null;
          sort_order: number;
          text: string;
          ticked_at: string | null;
          ticked_by: string | null;
          updated_at: string;
        };
        Insert: {
          checklist_id: string;
          created_at?: string;
          emoji?: string | null;
          id?: string;
          is_ticked?: boolean;
          pet_id?: string | null;
          sort_order?: number;
          text: string;
          ticked_at?: string | null;
          ticked_by?: string | null;
          updated_at?: string;
        };
        Update: {
          checklist_id?: string;
          created_at?: string;
          emoji?: string | null;
          id?: string;
          is_ticked?: boolean;
          pet_id?: string | null;
          sort_order?: number;
          text?: string;
          ticked_at?: string | null;
          ticked_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'travel_checklist_items_checklist_id_fkey';
            columns: ['checklist_id'];
            isOneToOne: false;
            referencedRelation: 'travel_checklists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'travel_checklist_items_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          }
        ];
      };
      travel_checklists: {
        Row: {
          created_at: string;
          created_by: string | null;
          emoji: string | null;
          household_id: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          emoji?: string | null;
          household_id: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          emoji?: string | null;
          household_id?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'travel_checklists_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      user_entitlements: {
        Row: {
          is_pro: boolean;
          source: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          is_pro?: boolean;
          source?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          is_pro?: boolean;
          source?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      account_deletion_blockers: { Args: never; Returns: Json };
      add_pet:
        | {
            Args: {
              feeding_times: Json | null;
              household_timezone?: string | null;
              pet_birthdate: string | null;
              pet_birthdate_is_approximate: boolean | null;
              pet_breed: string | null;
              pet_name: string | null;
              pet_pet_type?: Database['public']['Enums']['pet_type'] | null;
              pet_photo_url: string | null;
              pet_sex: Database['public']['Enums']['pet_sex'] | null;
              target_household_id?: string | null;
            };
            Returns: {
              bio: string | null;
              birthdate: string | null;
              birthdate_is_approximate: boolean;
              breed: string | null;
              breed_freetext: string | null;
              breed_id: string | null;
              created_at: string;
              household_id: string;
              id: string;
              name: string;
              pet_type: Database['public']['Enums']['pet_type'];
              photo_url: string | null;
              sex: Database['public']['Enums']['pet_sex'] | null;
            };
            SetofOptions: {
              from: '*';
              to: 'pets';
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: {
              feeding_times: Json | null;
              household_timezone?: string | null;
              pet_birthdate: string | null;
              pet_birthdate_is_approximate: boolean | null;
              pet_breed: string | null;
              pet_breed_id?: string | null;
              pet_name: string | null;
              pet_pet_type?: Database['public']['Enums']['pet_type'] | null;
              pet_photo_url: string | null;
              pet_sex: Database['public']['Enums']['pet_sex'] | null;
              target_household_id?: string | null;
            };
            Returns: {
              bio: string | null;
              birthdate: string | null;
              birthdate_is_approximate: boolean;
              breed: string | null;
              breed_freetext: string | null;
              breed_id: string | null;
              created_at: string;
              household_id: string;
              id: string;
              name: string;
              pet_type: Database['public']['Enums']['pet_type'];
              photo_url: string | null;
              sex: Database['public']['Enums']['pet_sex'] | null;
            };
            SetofOptions: {
              from: '*';
              to: 'pets';
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      add_pet_photo: {
        Args: { p_pet_id: string | null; p_storage_path: string | null };
        Returns: {
          created_at: string;
          id: string;
          pet_id: string;
          sort_order: number;
          storage_path: string;
        };
        SetofOptions: {
          from: '*';
          to: 'pet_photos';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      block_feature_request_author: {
        Args: { request_id: string | null };
        Returns: undefined;
      };
      count_reported_feature_requests: { Args: never; Returns: number };
      create_feature_request: {
        Args: { description?: string | null; title: string | null };
        Returns: string;
      };
      create_household_invite: {
        Args: {
          invitee_email: string | null;
          invitee_role: Database['public']['Enums']['household_role'] | null;
          target_household_id: string | null;
        };
        Returns: Json;
      };
      create_household_with_pet: {
        Args: {
          feeding_times: Json | null;
          household_handle: string | null;
          household_is_listed: boolean | null;
          household_name: string | null;
          household_timezone: string | null;
          pet_birthdate: string | null;
          pet_birthdate_is_approximate: boolean | null;
          pet_breed_id?: string | null;
          pet_name: string | null;
          pet_pet_type?: Database['public']['Enums']['pet_type'] | null;
          pet_photo_url: string | null;
          pet_sex: Database['public']['Enums']['pet_sex'] | null;
        };
        Returns: Json;
      };
      create_post: {
        Args: {
          photo_storage_paths: string[] | null;
          post_caption?: string | null;
          post_occasion_id?: string | null;
          post_occurred_at?: string | null;
          post_title?: string | null;
          tagged_pet_ids?: string[] | null;
          target_household_id: string | null;
        };
        Returns: {
          author_id: string | null;
          caption: string | null;
          created_at: string;
          edited_at: string | null;
          household_id: string;
          id: string;
          occasion_id: string | null;
          occurred_at: string;
          title: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decline_household_invite: { Args: { invite_id: string | null }; Returns: Json };
      delete_feature_request: {
        Args: { request_id: string | null };
        Returns: undefined;
      };
      delete_household: {
        Args: { confirmed_name: string | null; target_household_id: string | null };
        Returns: Json;
      };
      delete_pet_photo: {
        Args: { p_photo_id: string | null; p_photo_url: string | null };
        Returns: string;
      };
      end_feed_time: {
        Args: { target_pet_id: string | null; target_series_id: string | null };
        Returns: undefined;
      };
      follow_preview: { Args: { target_household_id: string | null }; Returns: Json };
      get_feature_request: {
        Args: { request_id: string | null };
        Returns: {
          created_at: string;
          description: string;
          has_voted: boolean;
          id: string;
          is_hidden: boolean;
          is_mine: boolean;
          is_team_post: boolean;
          report_count: number;
          status: Database['public']['Enums']['feature_request_status'];
          title: string;
          vote_count: number;
        }[];
      };
      handle_available: { Args: { candidate: string | null }; Returns: boolean };
      handle_suggestions: {
        Args: { stem: string | null; wanted?: number | null };
        Returns: string[];
      };
      has_unseen_posts: {
        Args: { target_household_id: string | null };
        Returns: boolean;
      };
      household_photo_manifest: {
        Args: { confirmed_name: string | null; target_household_id: string | null };
        Returns: Json;
      };
      household_reminder_days: {
        Args: {
          from_date: string | null;
          target_household_id: string | null;
          to_date: string | null;
        };
        Returns: {
          day: string;
          kinds: string[];
        }[];
      };
      is_crumpet_team: { Args: never; Returns: boolean };
      is_feature_board_banned: { Args: never; Returns: boolean };
      is_household_pro: {
        Args: { target_household_id: string | null };
        Returns: boolean;
      };
      leave_household: { Args: { target_household_id: string | null }; Returns: Json };
      list_alerts: {
        Args: {
          before_created_at?: string | null;
          before_id?: string | null;
          page_size?: number | null;
          target_household_id: string | null;
        };
        Returns: {
          actor_first_name: string;
          actor_last_name: string;
          comment_body: string;
          comment_id: string;
          comment_is_reply_to_me: boolean;
          comment_post_is_mine: boolean;
          created_at: string;
          id: string;
          is_read: boolean;
          kind: Database['public']['Enums']['alert_kind'];
          pet_id: string;
          pet_name: string;
          post_caption: string;
          post_id: string;
          slot_label: string;
          subject_first_name: string;
          subject_is_me: boolean;
          subject_last_name: string;
          suppressed_reason: string;
        }[];
      };
      list_feature_requests: {
        Args: {
          after_created_at?: string | null;
          after_id?: string | null;
          after_vote_count?: number | null;
          page_size?: number | null;
          reported_only?: boolean | null;
          sort?: string | null;
        };
        Returns: {
          created_at: string;
          description: string;
          has_voted: boolean;
          id: string;
          is_hidden: boolean;
          is_mine: boolean;
          is_team_post: boolean;
          report_count: number;
          status: Database['public']['Enums']['feature_request_status'];
          title: string;
          vote_count: number;
        }[];
      };
      list_following: {
        Args: never;
        Returns: {
          household_id: string;
          name: string;
          pet_count: number;
          requested_at: string;
          status: Database['public']['Enums']['follow_status'];
        }[];
      };
      log_feed: {
        Args: {
          confirmed?: boolean | null;
          target_logged_at?: string | null;
          target_notes?: string | null;
          target_occurrence_date?: string | null;
          target_pet_id: string | null;
          target_series_id?: string | null;
        };
        Returns: Json;
      };
      mark_alerts_read: { Args: { alert_ids: string[] | null }; Returns: undefined };
      mark_all_alerts_read: {
        Args: { target_household_id: string | null };
        Returns: undefined;
      };
      pause_pet: {
        Args: { target_pet_id: string | null; target_reason?: string | null };
        Returns: string;
      };
      pet_feed_times: {
        Args: { target_pet_id: string | null };
        Returns: {
          days_of_week: number[];
          instructions: string;
          label: Database['public']['Enums']['feeding_schedule_label'];
          local_time: string;
          series_id: string;
        }[];
      };
      pet_occurrence_states: {
        Args: { target_date: string | null; target_pet_id: string | null };
        Returns: {
          instructions: string;
          label: Database['public']['Enums']['feeding_schedule_label'];
          local_time: string;
          satisfied_at: string;
          satisfied_by: string;
          satisfying_log_id: string;
          scheduled_at: string;
          series_id: string;
          state: string;
        }[];
      };
      pet_reminders: {
        Args: { target_date: string | null; target_pet_id: string | null };
        Returns: {
          done_at: string;
          done_by: string;
          kind: Database['public']['Enums']['reminder_kind'];
          local_time: string;
          reminder_id: string;
          state: string;
          title: string;
        }[];
      };
      pet_reminders_range: {
        Args: { from_date: string | null; target_pet_id: string | null; to_date: string | null };
        Returns: {
          done_at: string;
          done_by: string;
          kind: Database['public']['Enums']['reminder_kind'];
          local_time: string;
          occurrence_date: string;
          reminder_id: string;
          state: string;
          title: string;
        }[];
      };
      prepare_account_deletion: {
        Args: { target_user_id: string | null };
        Returns: Json;
      };
      preview_household_invite: { Args: { invite_code: string | null }; Returns: Json };
      redeem_household_invite: {
        Args: { invite_code?: string | null; invite_id?: string | null };
        Returns: Json;
      };
      register_push_token: {
        Args: { target_platform: string | null; target_token: string | null };
        Returns: undefined;
      };
      remove_follower: { Args: { follow_id: string | null }; Returns: Json };
      remove_household_member: {
        Args: { target_household_id: string | null; target_user_id: string | null };
        Returns: Json;
      };
      report_feature_request: {
        Args: { request_id: string | null };
        Returns: undefined;
      };
      request_follow: { Args: { target_household_id: string | null }; Returns: Json };
      reset_travel_checklist: {
        Args: { target_checklist_id: string | null };
        Returns: undefined;
      };
      respond_to_follow_request: {
        Args: { accept: boolean | null; follow_id: string | null };
        Returns: Json;
      };
      restore_feature_request: {
        Args: { request_id: string | null };
        Returns: undefined;
      };
      resume_pet: { Args: { target_pet_id: string | null }; Returns: undefined };
      revoke_household_invite: { Args: { invite_id: string | null }; Returns: Json };
      save_feed_time: {
        Args: {
          target_days_of_week?: number[] | null;
          target_instructions?: string | null;
          target_label: Database['public']['Enums']['feeding_schedule_label'] | null;
          target_local_time: string | null;
          target_pet_id: string | null;
          target_series_id?: string | null;
        };
        Returns: string;
      };
      search_households: {
        Args: { max_results?: number | null; query: string | null };
        Returns: {
          handle: string;
          household_id: string;
          name: string;
          pet_count: number;
          relationship: string;
        }[];
      };
      set_feature_request_status: {
        Args: {
          new_status: Database['public']['Enums']['feature_request_status'] | null;
          request_id: string | null;
        };
        Returns: undefined;
      };
      set_member_role: {
        Args: {
          new_role: Database['public']['Enums']['household_role'] | null;
          target_household_id: string | null;
          target_user_id: string | null;
        };
        Returns: Json;
      };
      unfollow_household: {
        Args: { target_household_id: string | null };
        Returns: Json;
      };
      unread_alert_count: {
        Args: { target_household_id: string | null };
        Returns: number;
      };
      update_post: {
        Args: {
          photo_storage_paths: string[] | null;
          post_caption?: string | null;
          post_occasion_id?: string | null;
          post_title?: string | null;
          tagged_pet_ids?: string[] | null;
          target_post_id: string | null;
        };
        Returns: {
          author_id: string | null;
          caption: string | null;
          created_at: string;
          edited_at: string | null;
          household_id: string;
          id: string;
          occasion_id: string | null;
          occurred_at: string;
          title: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'posts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      alert_kind:
        | 'feed_logged'
        | 'missed_feed'
        | 'post'
        | 'member_removed'
        | 'member_role_changed'
        | 'member_left'
        | 'post_liked'
        | 'post_commented'
        | 'comment_liked'
        | 'feed_due'
        | 'reminder_due'
        | 'follow_requested'
        | 'feature_request_reported';
      breed_species: 'dog' | 'cat';
      feature_request_status: 'open' | 'planned' | 'in_progress' | 'done' | 'declined';
      feeding_schedule_label: 'morning' | 'lunch' | 'dinner' | 'custom';
      follow_status: 'pending' | 'accepted' | 'removed';
      household_role: 'owner' | 'contributor';
      invite_status: 'pending' | 'accepted' | 'declined' | 'revoked';
      pet_sex: 'male' | 'female';
      pet_type: 'dog' | 'cat' | 'other';
      reminder_kind: 'feed' | 'medication' | 'vet';
      reminder_repeat: 'once' | 'weekly' | 'monthly';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      alert_kind: [
        'feed_logged',
        'missed_feed',
        'post',
        'member_removed',
        'member_role_changed',
        'member_left',
        'post_liked',
        'post_commented',
        'comment_liked',
        'feed_due',
        'reminder_due',
        'follow_requested',
        'feature_request_reported'
      ],
      breed_species: ['dog', 'cat'],
      feature_request_status: ['open', 'planned', 'in_progress', 'done', 'declined'],
      feeding_schedule_label: ['morning', 'lunch', 'dinner', 'custom'],
      follow_status: ['pending', 'accepted', 'removed'],
      household_role: ['owner', 'contributor'],
      invite_status: ['pending', 'accepted', 'declined', 'revoked'],
      pet_sex: ['male', 'female'],
      pet_type: ['dog', 'cat', 'other'],
      reminder_kind: ['feed', 'medication', 'vet'],
      reminder_repeat: ['once', 'weekly', 'monthly']
    }
  }
} as const;
