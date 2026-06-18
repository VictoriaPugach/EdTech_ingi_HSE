import { useMemo } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useTrackToggle,
  useRoomContext,
} from '@livekit/components-react';
import { Track, VideoPresets, type RoomOptions } from 'livekit-client';
import '@livekit/components-styles';
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
      <div className={styles.grid}>
        <VideoTiles />
      </div>
      <ClassControls canPublish={canPublish} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

/** Плитки участников: камеры + демонстрация экрана. GridLayout сам пагинирует на многих. */
function VideoTiles() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} className={styles.gridLayout}>
      <ParticipantTile />
    </GridLayout>
  );
}

/** Нижняя панель управления (Figma «Frame 100»): Микрофон / Камера / Выйти. */
function ClassControls({ canPublish }: { canPublish: boolean }) {
  const room = useRoomContext();
  return (
    <div className={styles.controls}>
      {canPublish && <ToggleButton source={Track.Source.Microphone} label="Микрофон" icon="🎤" />}
      {canPublish && <ToggleButton source={Track.Source.Camera} label="Камера" icon="📷" />}
      <button className={styles.leave} onClick={() => room.disconnect()}>
        <span aria-hidden>📞</span> Выйти
      </button>
    </div>
  );
}

function ToggleButton({
  source,
  label,
  icon,
}: {
  source: Track.Source.Microphone | Track.Source.Camera;
  label: string;
  icon: string;
}) {
  const { enabled, pending, toggle } = useTrackToggle({ source });
  return (
    <button
      className={[styles.ctrl, enabled ? styles.ctrlOn : styles.ctrlOff].join(' ')}
      onClick={() => void toggle()}
      disabled={pending}
    >
      <span aria-hidden>{icon}</span> {label}
    </button>
  );
}
