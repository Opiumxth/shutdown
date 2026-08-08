const SOUNDS = {
  click: "/win-xp-pack/Sounds/Windows XP Menu Command.wav",
  error: "/win-xp-pack/Sounds/Windows XP Error.wav",
  notify: "/win-xp-pack/Sounds/Windows XP Notify.wav",
  critical: "/win-xp-pack/Sounds/Windows XP Critical Stop.wav",
} as const;

type SoundName = keyof typeof SOUNDS;

function play(name: SoundName) {
  try {
    void new Audio(SOUNDS[name])
      .play()
      .catch(() => {
        // Promise rejection (NotSupportedError, autoplay block) is async
        // and cannot be caught by try/catch alone.
      });
  } catch {
    // Synchronous construction/play() failures are best-effort too.
  }
}

export const sound = {
  playClick: () => play("click"),
  playError: () => play("error"),
  playNotify: () => play("notify"),
  playCritical: () => play("critical"),
};
