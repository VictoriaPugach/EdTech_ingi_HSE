import { useMemo } from 'react';
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useTrackToggle,
  useRoomContext,
} from '@livekit/components-react';
import { Track, VideoPresets, type RoomOptions } from 'livekit-client';
import '@livekit/components-styles';
import {
  MicIcon, MicOffIcon, CameraIcon, CameraOffIcon, PhoneOffIcon,
} from '../../../ui/icons';
import styles from './VideoCall.module.scss';

interface VideoCallProps {
  /** URL медиасервера LiveKit (из POST /sessions/:id/livekit-token). */
  url: string;
  /** Access-токен комнаты. */
  token: string;
  /** VIEWER (false) подключается только на просмотр — без камеры/микрофона. */
  canPublish: boolean;
  /** Вызывается при выходе/обрыве — родитель убирает панель. */
  onLeave: () => void;
}

/**
 * Групповой видеозвонок занятия через SFU LiveKit (ADR video-livekit-sfu).
 *
 * Под требование «до 30 учеников, несколько камер, без лагов» включены механизмы
 * экономии трафика, чтобы исходящий поток клиента НЕ рос с числом участников:
 *   • simulcast — публикуем 2 слоя (180p/360p), SFU отдаёт подписчику нужный;
 *   • adaptiveStream — качество подписки подстраивается под размер плитки и канал;
 *   • dynacast — неиспользуемые слои сервер не пересылает.
 * Камера/микрофон по умолчанию выключены — включаются вручную (меньше нагрузка).
 */
export function VideoCall({ url, token, canPublish, onLeave }: VideoCallProps) {
  const roomOptions = useMemo<RoomOptions>(
    () => ({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h360.resolution },
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
        videoCodec: 'vp8',
        dtx: true,
        red: true,
      },
    }),
    [],
  );

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio={false}
      video={false}
      options={roomOptions}
      onDisconnected={onLeave}
      data-lk-theme="default"
      className={styles.room}
    >
      <VideoTiles />
      <ClassControls canPublish={canPublish} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

/** Главное окно (4:3, чтобы не обрезать лица) + ряд миниатюр остальных участников. */
function VideoTiles() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const [main, ...rest] = tracks;

  return (
    <div className={styles.tiles}>
      {main && (
        <div className={styles.mainTile}>
          <ParticipantTile trackRef={main} />
        </div>
      )}
      {rest.length > 0 && (
        <div className={styles.thumbs}>
          {rest.map((t, i) => (
            <div key={i} className={styles.thumb}>
              <ParticipantTile trackRef={t} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Кнопки управления рядом с камерой (Figma): микрофон / камера / выйти. */
function ClassControls({ canPublish }: { canPublish: boolean }) {
  const room = useRoomContext();
  return (
    <div className={styles.controls}>
      {canPublish && (
        <ToggleButton source={Track.Source.Microphone} OnIcon={MicIcon} OffIcon={MicOffIcon} label="Микрофон" />
      )}
      {canPublish && (
        <ToggleButton source={Track.Source.Camera} OnIcon={CameraIcon} OffIcon={CameraOffIcon} label="Камера" />
      )}
      <button
        type="button"
        className={`${styles.ctrl} ${styles.leave}`}
        onClick={() => room.disconnect()}
        aria-label="Выйти из звонка"
        title="Выйти"
      >
        <PhoneOffIcon width={20} height={20} />
      </button>
    </div>
  );
}

function ToggleButton({
  source,
  OnIcon,
  OffIcon,
  label,
}: {
  source: Track.Source.Microphone | Track.Source.Camera;
  OnIcon: (p: { width?: number; height?: number }) => JSX.Element;
  OffIcon: (p: { width?: number; height?: number }) => JSX.Element;
  label: string;
}) {
  const { enabled, pending, toggle } = useTrackToggle({ source });
  const Icon = enabled ? OnIcon : OffIcon;
  return (
    <button
      type="button"
      className={`${styles.ctrl} ${enabled ? styles.on : styles.off}`}
      onClick={() => void toggle()}
      disabled={pending}
      aria-label={label}
      title={label}
    >
      <Icon width={20} height={20} />
    </button>
  );
}
