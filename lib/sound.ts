type SoundDefinition = {
  src: string;
  volume: number;
};

const SOUNDS: Record<string, SoundDefinition> = {
  click: {
    src: "/win-xp-pack/Sounds/Windows XP Menu Command.wav",
    volume: 0.4,
  },
  hover: {
    src: "/win-xp-pack/Sounds/Windows XP Menu Command.wav",
    volume: 0.35,
  },
  navigation: {
    src: "/win-xp-pack/Sounds/Windows Navigation Start.wav",
    volume: 0.4,
  },
  error: {
    src: "/win-xp-pack/Sounds/Windows XP Error.wav",
    volume: 0.6,
  },
  notify: {
    src: "/win-xp-pack/Sounds/Windows XP Notify.wav",
    volume: 0.4,
  },
  critical: {
    src: "/win-xp-pack/Sounds/Windows XP Critical Stop.wav",
    volume: 0.6,
  },
  hardwareInsert: {
    src: "/win-xp-pack/Sounds/Windows XP Hardware Insert.wav",
    volume: 0.5,
  },
  ding: {
    src: "/win-xp-pack/Sounds/Windows XP Ding.wav",
    volume: 0.5,
  },
  balloon: {
    src: "/win-xp-pack/Sounds/Windows XP Balloon.wav",
    volume: 0.5,
  },
  exclamation: {
    src: "/win-xp-pack/Sounds/Windows XP Exclamation.wav",
    volume: 0.5,
  },
  recycle: {
    src: "/win-xp-pack/Sounds/Windows XP Recycle.wav",
    volume: 0.5,
  },
  logon: {
    src: "/win-xp-pack/Sounds/Windows XP Logon Sound.wav",
    volume: 0.6,
  },
  shutdown: {
    src: "/win-xp-pack/Sounds/Windows XP Shutdown.wav",
    volume: 0.6,
  },
};

type SoundName = keyof typeof SOUNDS;

function play(name: SoundName) {
  try {
    const { src, volume } = SOUNDS[name];
    const audio = new Audio(src);
    audio.volume = volume;
    // Play is async; rejections (NotSupportedError, autoplay policy) are
    // expected and ignored — best-effort audio juice, never crashes a render.
    void audio.play().catch(() => {});
  } catch {
    // Synchronous construction/play() failures are best-effort too.
  }
}

export const sound = {
  playClick: () => play("click"),
  playHover: () => play("hover"),
  playNavigation: () => play("navigation"),
  playError: () => play("error"),
  playNotify: () => play("notify"),
  playCritical: () => play("critical"),
  playHardwareInsert: () => play("hardwareInsert"),
  playDing: () => play("ding"),
  playBalloon: () => play("balloon"),
  playExclamation: () => play("exclamation"),
  playRecycle: () => play("recycle"),
  playLogon: () => play("logon"),
  playShutdown: () => play("shutdown"),
};
