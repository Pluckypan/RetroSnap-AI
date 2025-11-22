export interface Photo {
  id: string;
  dataUrl: string;
  caption: string | null;
  timestamp: number;
  isDeveloping: boolean;
  // Positioning for draggable canvas
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

export enum CameraState {
  IDLE = 'IDLE',
  SHOOTING = 'SHOOTING', // The split second the shutter is pressed
  EJECTING = 'EJECTING', // The animation of the photo coming out
  DEVELOPING = 'DEVELOPING' // The photo sitting there turning from gray to color
}

export enum FilterType {
  ORIGINAL = 'Original',
  // Retro
  RETRO_CLASSIC = 'Classic',
  RETRO_NOIR = 'Noir',
  RETRO_INSTANT = 'Instant',
  // Cinematic
  CINE_TEAL_ORANGE = 'Blockbuster',
  CINE_MOODY = 'Moody',
  CINE_VIVID = 'Vivid',
}