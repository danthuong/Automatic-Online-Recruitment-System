export interface AIAlert {
  type: 'SUSPICIOUS' | 'CRITICAL' | 'WARNING'
  message: string
  timestamp: number
}

export interface Camera0Result {
  face_count: number
  calibrated: boolean
  calibration_progress: number
  alerts: AIAlert[]
  gaze: { gaze_x: number; gaze_y: number }
  head_angle: { pitch: number; yaw: number }
  face_direction: string
  is_alerting: boolean
  violation_time: number
}

export interface Camera1Result {
  hands_detected: number
  gesture: string | null
  cheating_probability: number
  is_cheating: boolean
  is_strike: boolean
}

export interface AIProctorResponse {
  camera_0: Camera0Result
  camera_1: Camera1Result
  timestamp: number
}

export interface AIProctorState {
  isConnected: boolean
  calibrationStatus: 'idle' | 'calibrating' | 'calibrated' | 'failed'
  calibrationProgress: number
  faceCount: number
  gaze: { x: number; y: number } | null
  headAngle: { pitch: number; yaw: number } | null
  faceDirection: string
  handsDetected: number
  gesture: string | null
  cheatingProbability: number
  alerts: AIAlert[]
  lastUpdateTime: number
}
