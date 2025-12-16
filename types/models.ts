import { Role, GamePhase } from './enums';

export interface Player {
    id: string;
    room_id: string;
    name: string;
    role: Role | null;
    is_ready: boolean;
    joined_at: string;
    user_id?: string;
    avatar_url?: string;
}

export interface Room {
    id: string;
    code: string;
    status: GamePhase;
    created_at: string;
    host_id: string;
    votes?: Record<string, string>; // { playerId: suspectId }
    outcome?: 'WON' | 'LOST';
    custom_case?: Case;
    started_at?: string;
    finished_at?: string;
}

export interface Question {
    id: string;
    text: string;
    response: string;
    unlocks_clue_id?: string; // Can unlock a new clue
}

export interface Suspect {
    id: string;
    name: string;
    bio: string;
    detailed_bio?: string;
    relationships?: { target_id: string; type: string; description: string }[];
    motive?: string;
    avatar_url?: string;
    dialogues: Question[];
}

export interface TimelineEvent {
    id: string;
    title: string;
    time: string; // Display time (e.g. "20:00")
    description: string;
    correct_order: number; // 1-based index
}

export interface EvidenceCombination {
    id: string;
    clue_id_1: string;
    clue_id_2: string;
    result_clue: Clue;
}

export interface Case {
    id: string;
    title: string;
    intro: string;
    suspects: Suspect[];
    clues: Clue[];
    timeline_events: TimelineEvent[];
    evidence_combinations: EvidenceCombination[];
    solution: {
        killer_id: string;
        killer_name: string;
        motive: string;
    };
}

export interface Clue {
    id: string;
    title: string;
    description: string;
    image_url?: string;
    visible_to: Role | 'BOTH';
    is_locked: boolean;
    locked_with_code?: string;
    type?: 'PHYSICAL' | 'DOCUMENT' | 'TESTIMONY' | 'ANALYSIS';
}

export interface GameState {
    room_id: string;
    phase: GamePhase;
    unlocked_clues: string[]; // Clue IDs
    current_turn?: Role; // If we want turn-based, otherwise realtime
}

export interface Message {
    id: string;
    room_id: string;
    player_id: string | null;
    player_name: string;
    content: string;
    created_at: string;
    is_system?: boolean;
}
