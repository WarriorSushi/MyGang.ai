/**
 * Canonical Character type — a member of the user's gang. One of the 14
 * hand-crafted personas. Used by both web and mobile.
 */
export interface Character {
    id: string;
    name: string;
    vibe: string;
    color: string;
    roleLabel?: string;
    avatar?: string;
    archetype?: string;
    gradient?: string;
    voice?: string;
    sample?: string;
    typingSpeed?: number;
    tags?: string[];
}
