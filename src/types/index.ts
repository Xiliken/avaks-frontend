// src/types.ts
export interface Log {
    type: string;
    message: string;
}

export interface Video {
    url: string;
}

export interface Photo {
    url: string;
}

export interface Document {
    name: string;
    url: string;
}

export interface Comment {
    author: string;
    text: string;
}

export interface FlightDetailsData {
    flightId: string;
    date: string;
    pilot: string;
    status: string;
    logs: Log[];
    videos: Video[];
    photos: Photo[];
    documents: Document[];
    comments: Comment[];
}

export interface Flight {
    id: string;
    date: string;
    pilot: string;
    type: 'acceptance' | 'experimental' | 'resource' | 'operational';
}

export interface Trial {
    id: string;
    name: string;
    flights: Flight[];
}
