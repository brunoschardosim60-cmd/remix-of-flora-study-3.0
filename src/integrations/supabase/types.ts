export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_action_logs: {
        Row: {
          action_type: string
          admin_id: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          action_type: string
          admin_id: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          note?: string
          user_id: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_user_snapshots: {
        Row: {
          created_at: string
          created_by: string
          id: string
          reason: string
          snapshot: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          reason?: string
          snapshot?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          reason?: string
          snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          action_type: string
          cost_estimate: number
          created_at: string
          error_message: string
          id: string
          metadata: Json
          model: string
          success: boolean
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          action_type: string
          cost_estimate?: number
          created_at?: string
          error_message?: string
          id?: string
          metadata?: Json
          model?: string
          success?: boolean
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          action_type?: string
          cost_estimate?: number
          created_at?: string
          error_message?: string
          id?: string
          metadata?: Json
          model?: string
          success?: boolean
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          member_count: number | null
          name: string
          slug: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          member_count?: number | null
          name: string
          slug: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          member_count?: number | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      concurso_ia_attempts: {
        Row: {
          acertou: boolean
          alternativa_marcada: string
          assunto: string
          banca: string
          correta: string
          created_at: string
          disciplina: string
          enunciado: string
          enunciado_hash: string
          id: string
          nivel: string
          payload: Json
          session_id: string
          tema: string
          tempo_ms: number
          tipo: string
          user_id: string
        }
        Insert: {
          acertou?: boolean
          alternativa_marcada?: string
          assunto?: string
          banca?: string
          correta?: string
          created_at?: string
          disciplina?: string
          enunciado?: string
          enunciado_hash?: string
          id?: string
          nivel?: string
          payload?: Json
          session_id: string
          tema?: string
          tempo_ms?: number
          tipo?: string
          user_id: string
        }
        Update: {
          acertou?: boolean
          alternativa_marcada?: string
          assunto?: string
          banca?: string
          correta?: string
          created_at?: string
          disciplina?: string
          enunciado?: string
          enunciado_hash?: string
          id?: string
          nivel?: string
          payload?: Json
          session_id?: string
          tema?: string
          tempo_ms?: number
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      concurso_question_attempts: {
        Row: {
          acertou: boolean
          alternativa_marcada: string
          created_at: string
          id: string
          modo: string
          question_id: string
          tempo_ms: number
          user_id: string
        }
        Insert: {
          acertou?: boolean
          alternativa_marcada?: string
          created_at?: string
          id?: string
          modo?: string
          question_id: string
          tempo_ms?: number
          user_id: string
        }
        Update: {
          acertou?: boolean
          alternativa_marcada?: string
          created_at?: string
          id?: string
          modo?: string
          question_id?: string
          tempo_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concurso_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "concurso_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      concurso_questions: {
        Row: {
          afirmativa: string
          alternativas: Json
          ano: number | null
          banca: string
          cargo: string
          correta: string
          created_at: string
          created_by: string | null
          dificuldade: string
          disciplina: string
          enunciado: string
          explicacao: string
          id: string
          imagem_urls: string[]
          nivel: string
          orgao: string
          origem: string
          tags: string[]
          tem_imagem: boolean
          tema: string
          tipo: string
          updated_at: string
        }
        Insert: {
          afirmativa?: string
          alternativas?: Json
          ano?: number | null
          banca?: string
          cargo?: string
          correta?: string
          created_at?: string
          created_by?: string | null
          dificuldade?: string
          disciplina?: string
          enunciado?: string
          explicacao?: string
          id?: string
          imagem_urls?: string[]
          nivel?: string
          orgao?: string
          origem?: string
          tags?: string[]
          tem_imagem?: boolean
          tema?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          afirmativa?: string
          alternativas?: Json
          ano?: number | null
          banca?: string
          cargo?: string
          correta?: string
          created_at?: string
          created_by?: string | null
          dificuldade?: string
          disciplina?: string
          enunciado?: string
          explicacao?: string
          id?: string
          imagem_urls?: string[]
          nivel?: string
          orgao?: string
          origem?: string
          tags?: string[]
          tem_imagem?: boolean
          tema?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      concurso_simulado_results: {
        Row: {
          acertos: number
          banca: string
          created_at: string
          disciplina: string
          duracao_ms: number
          id: string
          metadata: Json
          origem: string
          titulo: string
          total_questoes: number
          user_id: string
        }
        Insert: {
          acertos?: number
          banca?: string
          created_at?: string
          disciplina?: string
          duracao_ms?: number
          id?: string
          metadata?: Json
          origem?: string
          titulo?: string
          total_questoes?: number
          user_id: string
        }
        Update: {
          acertos?: number
          banca?: string
          created_at?: string
          disciplina?: string
          duracao_ms?: number
          id?: string
          metadata?: Json
          origem?: string
          titulo?: string
          total_questoes?: number
          user_id?: string
        }
        Relationships: []
      }
      concurso_trilhas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          disciplina: string
          id: string
          ordem: number
          pacote: string
          topicos: Json
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          disciplina: string
          id?: string
          ordem?: number
          pacote: string
          topicos?: Json
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          disciplina?: string
          id?: string
          ordem?: number
          pacote?: string
          topicos?: Json
          updated_at?: string
        }
        Relationships: []
      }
      content_cache: {
        Row: {
          banca: string
          cache_key: string
          created_at: string
          dificuldade: string
          estilo: string
          expires_at: string | null
          hits: number
          id: string
          materia: string
          objetivo: string
          payload: Json
          tema: string
          tipo: string
          updated_at: string
        }
        Insert: {
          banca?: string
          cache_key: string
          created_at?: string
          dificuldade?: string
          estilo?: string
          expires_at?: string | null
          hits?: number
          id?: string
          materia?: string
          objetivo?: string
          payload?: Json
          tema?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          banca?: string
          cache_key?: string
          created_at?: string
          dificuldade?: string
          estilo?: string
          expires_at?: string | null
          hits?: number
          id?: string
          materia?: string
          objetivo?: string
          payload?: Json
          tema?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          lessons_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lessons_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lessons_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      essay_themes: {
        Row: {
          competencias_destaque: string[]
          created_at: string
          created_by: string | null
          dificuldade: string
          edition: string
          eixo: string
          id: string
          is_official: boolean
          nivel_enem: number
          origem: string
          proposta_modelo: string
          prova_url: string
          repertorios: Json
          tema: string
          texto_motivador: string
          updated_at: string
          year: number | null
        }
        Insert: {
          competencias_destaque?: string[]
          created_at?: string
          created_by?: string | null
          dificuldade?: string
          edition?: string
          eixo?: string
          id?: string
          is_official?: boolean
          nivel_enem?: number
          origem?: string
          proposta_modelo?: string
          prova_url?: string
          repertorios?: Json
          tema: string
          texto_motivador?: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          competencias_destaque?: string[]
          created_at?: string
          created_by?: string | null
          dificuldade?: string
          edition?: string
          eixo?: string
          id?: string
          is_official?: boolean
          nivel_enem?: number
          origem?: string
          proposta_modelo?: string
          prova_url?: string
          repertorios?: Json
          tema?: string
          texto_motivador?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      essays: {
        Row: {
          competencia_1: number | null
          competencia_2: number | null
          competencia_3: number | null
          competencia_4: number | null
          competencia_5: number | null
          corrected_at: string | null
          created_at: string
          feedback_competencias: Json
          feedback_geral: string
          id: string
          line_count: number
          nota_total: number | null
          status: string
          tema: string
          texto: string
          tipo_prova: string
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          competencia_1?: number | null
          competencia_2?: number | null
          competencia_3?: number | null
          competencia_4?: number | null
          competencia_5?: number | null
          corrected_at?: string | null
          created_at?: string
          feedback_competencias?: Json
          feedback_geral?: string
          id?: string
          line_count?: number
          nota_total?: number | null
          status?: string
          tema?: string
          texto?: string
          tipo_prova?: string
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          competencia_1?: number | null
          competencia_2?: number | null
          competencia_3?: number | null
          competencia_4?: number | null
          competencia_5?: number | null
          corrected_at?: string | null
          created_at?: string
          feedback_competencias?: Json
          feedback_geral?: string
          id?: string
          line_count?: number
          nota_total?: number | null
          status?: string
          tema?: string
          texto?: string
          tipo_prova?: string
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      flora_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          role: string
          seq: number
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          seq?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          seq?: number
          user_id?: string
        }
        Relationships: []
      }
      flora_decisions: {
        Row: {
          accepted: boolean | null
          created_at: string
          decision_type: string
          id: string
          reasoning: string
          recommendation: Json
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string
          decision_type: string
          id?: string
          reasoning?: string
          recommendation?: Json
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string
          decision_type?: string
          id?: string
          reasoning?: string
          recommendation?: Json
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      gamification_profiles: {
        Row: {
          created_at: string
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_block: number
          id: string
          last_seen_at: string
          lesson_id: string
          quiz_correct: number
          quiz_total: number
          seconds_studied: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_block?: number
          id?: string
          last_seen_at?: string
          lesson_id: string
          quiz_correct?: number
          quiz_total?: number
          seconds_studied?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_block?: number
          id?: string
          last_seen_at?: string
          lesson_id?: string
          quiz_correct?: number
          quiz_total?: number
          seconds_studied?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: Json
          cover_emoji: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_minutes: number
          id: string
          level: string
          published: boolean
          subject: string
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          content?: Json
          cover_emoji?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number
          id?: string
          level?: string
          published?: boolean
          subject: string
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          content?: Json
          cover_emoji?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number
          id?: string
          level?: string
          published?: boolean
          subject?: string
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          post_id: string
          user_id: string
        }
        Insert: {
          post_id: string
          user_id: string
        }
        Update: {
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_ai_activities: {
        Row: {
          created_at: string
          detail: string
          id: string
          notebook_id: string | null
          page_id: string | null
          title: string
          topic_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string
          id?: string
          notebook_id?: string | null
          page_id?: string | null
          title: string
          topic_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          notebook_id?: string | null
          page_id?: string | null
          title?: string
          topic_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_ai_activities_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebook_ai_activities_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "notebook_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_page_state: {
        Row: {
          created_at: string
          link_payload: Json
          meta_payload: Json
          notebook_id: string
          page_id: string
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          link_payload?: Json
          meta_payload?: Json
          notebook_id: string
          page_id: string
          summary?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          link_payload?: Json
          meta_payload?: Json
          notebook_id?: string
          page_id?: string
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_page_state_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebook_page_state_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: true
            referencedRelation: "notebook_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_pages: {
        Row: {
          content: string
          created_at: string
          drawing_data: Json | null
          id: string
          notebook_id: string
          page_number: number
          tags: string[]
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          drawing_data?: Json | null
          id?: string
          notebook_id: string
          page_number?: number
          tags?: string[]
          template?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          drawing_data?: Json | null
          id?: string
          notebook_id?: string
          page_number?: number
          tags?: string[]
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_pages_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_shares: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_public: boolean | null
          notebook_id: string
          owner_id: string
          share_token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          notebook_id: string
          owner_id: string
          share_token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          notebook_id?: string
          owner_id?: string
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_shares_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: true
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebook_shares_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          cover_color: string
          created_at: string
          folder: string | null
          id: string
          is_favorite: boolean
          subject: string | null
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_color?: string
          created_at?: string
          folder?: string | null
          id?: string
          is_favorite?: boolean
          subject?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_color?: string
          created_at?: string
          folder?: string | null
          id?: string
          is_favorite?: boolean
          subject?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ocr_cache: {
        Row: {
          created_at: string
          hash: string
          hits: number
          text: string
        }
        Insert: {
          created_at?: string
          hash: string
          hits?: number
          text: string
        }
        Update: {
          created_at?: string
          hash?: string
          hits?: number
          text?: string
        }
        Relationships: []
      }
      pending_user_imports: {
        Row: {
          created_at: string
          email: string
          imported: boolean
          imported_at: string | null
          payload: Json
        }
        Insert: {
          created_at?: string
          email: string
          imported?: boolean
          imported_at?: string | null
          payload: Json
        }
        Update: {
          created_at?: string
          email?: string
          imported?: boolean
          imported_at?: string | null
          payload?: Json
        }
        Relationships: []
      }
      posts: {
        Row: {
          comments_count: number | null
          community_id: string | null
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          media_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          community_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          media_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          community_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          media_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_until: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          is_public: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_until?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id: string
          is_admin?: boolean
          is_public?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_until?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
          is_public?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      question_attempts: {
        Row: {
          acertou: boolean
          alternativa_marcada: string
          created_at: string
          id: string
          modo: string
          question_id: string
          tempo_ms: number
          user_id: string
        }
        Insert: {
          acertou?: boolean
          alternativa_marcada?: string
          created_at?: string
          id?: string
          modo?: string
          question_id: string
          tempo_ms?: number
          user_id: string
        }
        Update: {
          acertou?: boolean
          alternativa_marcada?: string
          created_at?: string
          id?: string
          modo?: string
          question_id?: string
          tempo_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          alternativas: Json
          ano: number | null
          area: string
          caderno: string
          correta: string
          created_at: string
          created_by: string | null
          dia: number | null
          disciplina: string
          enunciado: string
          explicacao: string
          fonte_pdf: string
          id: string
          imagem_urls: string[]
          incomplete: boolean
          nivel_enem: number
          numero: number | null
          origem: string
          prova: string
          tem_imagem: boolean
          tema: string
          tema_classified_at: string | null
          tema_classifier_version: string | null
          tema_confidence: number | null
          tema_reason: string | null
          updated_at: string
        }
        Insert: {
          alternativas?: Json
          ano?: number | null
          area?: string
          caderno?: string
          correta?: string
          created_at?: string
          created_by?: string | null
          dia?: number | null
          disciplina?: string
          enunciado?: string
          explicacao?: string
          fonte_pdf?: string
          id?: string
          imagem_urls?: string[]
          incomplete?: boolean
          nivel_enem?: number
          numero?: number | null
          origem?: string
          prova?: string
          tem_imagem?: boolean
          tema?: string
          tema_classified_at?: string | null
          tema_classifier_version?: string | null
          tema_confidence?: number | null
          tema_reason?: string | null
          updated_at?: string
        }
        Update: {
          alternativas?: Json
          ano?: number | null
          area?: string
          caderno?: string
          correta?: string
          created_at?: string
          created_by?: string | null
          dia?: number | null
          disciplina?: string
          enunciado?: string
          explicacao?: string
          fonte_pdf?: string
          id?: string
          imagem_urls?: string[]
          incomplete?: boolean
          nivel_enem?: number
          numero?: number | null
          origem?: string
          prova?: string
          tem_imagem?: boolean
          tema?: string
          tema_classified_at?: string | null
          tema_classifier_version?: string | null
          tema_confidence?: number | null
          tema_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      spaced_reviews: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          interval_days: number
          materia: string
          scheduled_date: string
          topic_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          interval_days: number
          materia: string
          scheduled_date: string
          topic_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          interval_days?: number
          materia?: string
          scheduled_date?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: []
      }
      student_achievements: {
        Row: {
          created_at: string | null
          id: string
          last_earned_at: string | null
          type: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_earned_at?: string | null
          type: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_earned_at?: string | null
          type?: string
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      student_onboarding: {
        Row: {
          banca: string
          cargo: string
          completed: boolean
          conteudo_estudado: string | null
          created_at: string
          data_prova: string | null
          horas_disponiveis: number | null
          materias_dificeis: string[]
          meta_resultado: string
          nivel_atual: string | null
          objetivo: string
          objetivos_livre: string | null
          orgao: string
          rotina: string
          tempo_disponivel_min: number
          turno_preferido: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banca?: string
          cargo?: string
          completed?: boolean
          conteudo_estudado?: string | null
          created_at?: string
          data_prova?: string | null
          horas_disponiveis?: number | null
          materias_dificeis?: string[]
          meta_resultado?: string
          nivel_atual?: string | null
          objetivo?: string
          objetivos_livre?: string | null
          orgao?: string
          rotina?: string
          tempo_disponivel_min?: number
          turno_preferido?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banca?: string
          cargo?: string
          completed?: boolean
          conteudo_estudado?: string | null
          created_at?: string
          data_prova?: string | null
          horas_disponiveis?: number | null
          materias_dificeis?: string[]
          meta_resultado?: string
          nivel_atual?: string | null
          objetivo?: string
          objetivos_livre?: string | null
          orgao?: string
          rotina?: string
          tempo_disponivel_min?: number
          turno_preferido?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_performance: {
        Row: {
          accuracy: number
          acertos: number
          erro_recorrente: boolean
          erros: number
          id: string
          materia: string
          prioridade: number
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number
          acertos?: number
          erro_recorrente?: boolean
          erros?: number
          id?: string
          materia: string
          prioridade?: number
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number
          acertos?: number
          erro_recorrente?: boolean
          erros?: number
          id?: string
          materia?: string
          prioridade?: number
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_goals: {
        Row: {
          created_at: string
          monthly_hours_target: number
          updated_at: string
          user_id: string
          weekly_hours_target: number
          weekly_revisions_target: number
          weekly_topics_target: number
        }
        Insert: {
          created_at?: string
          monthly_hours_target?: number
          updated_at?: string
          user_id: string
          weekly_hours_target?: number
          weekly_revisions_target?: number
          weekly_topics_target?: number
        }
        Update: {
          created_at?: string
          monthly_hours_target?: number
          updated_at?: string
          user_id?: string
          weekly_hours_target?: number
          weekly_revisions_target?: number
          weekly_topics_target?: number
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_ms: number
          end_at: string | null
          id: string
          start_at: string
          subject: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          end_at?: string | null
          id: string
          start_at: string
          subject?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          end_at?: string | null
          id?: string
          start_at?: string
          subject?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_state: {
        Row: {
          created_at: string
          sessions: Json
          topics: Json
          updated_at: string
          user_id: string
          weekly_slots: Json
        }
        Insert: {
          created_at?: string
          sessions?: Json
          topics?: Json
          updated_at?: string
          user_id: string
          weekly_slots?: Json
        }
        Update: {
          created_at?: string
          sessions?: Json
          topics?: Json
          updated_at?: string
          user_id?: string
          weekly_slots?: Json
        }
        Relationships: []
      }
      study_topics: {
        Row: {
          created_at: string
          flashcards: Json
          id: string
          materia: string
          notas: string
          quiz_attempts: number
          quiz_errors: Json
          quiz_last_score: number | null
          rating: number
          revisions: Json
          skip_weekends_revisions: boolean
          study_date: string
          tema: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flashcards?: Json
          id: string
          materia: string
          notas?: string
          quiz_attempts?: number
          quiz_errors?: Json
          quiz_last_score?: number | null
          rating?: number
          revisions?: Json
          skip_weekends_revisions?: boolean
          study_date: string
          tema: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          flashcards?: Json
          id?: string
          materia?: string
          notas?: string
          quiz_attempts?: number
          quiz_errors?: Json
          quiz_last_score?: number | null
          rating?: number
          revisions?: Json
          skip_weekends_revisions?: boolean
          study_date?: string
          tema?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tier_limits: {
        Row: {
          action_type: string
          daily_limit: number
          id: string
          tier: string
          updated_at: string
        }
        Insert: {
          action_type: string
          daily_limit?: number
          id?: string
          tier: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          daily_limit?: number
          id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          materia: string | null
          metadata: Json
          topic_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          materia?: string | null
          metadata?: Json
          topic_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          materia?: string | null
          metadata?: Json
          topic_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_theme_status: {
        Row: {
          created_at: string
          essay_id: string | null
          id: string
          status: string
          theme_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          essay_id?: string | null
          id?: string
          status?: string
          theme_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          essay_id?: string | null
          id?: string
          status?: string
          theme_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_theme_status_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_theme_status_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "essay_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tiers: {
        Row: {
          created_at: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_slots: {
        Row: {
          concluido: boolean
          descricao: string
          dia: number
          horario: string
          id: string
          materia: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          concluido?: boolean
          descricao?: string
          dia: number
          horario: string
          id: string
          materia?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          concluido?: boolean
          descricao?: string
          dia?: number
          horario?: string
          id?: string
          materia?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_ai_quota: {
        Args: { p_action: string; p_user_id: string }
        Returns: Json
      }
      classify_question_tema: {
        Args: { p_disciplina: string; p_enunciado: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_moderator: { Args: never; Returns: boolean }
      is_support: { Args: never; Returns: boolean }
      question_stats: {
        Args: never
        Returns: {
          acertos: number
          question_id: string
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "support" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "support", "user"],
    },
  },
} as const
