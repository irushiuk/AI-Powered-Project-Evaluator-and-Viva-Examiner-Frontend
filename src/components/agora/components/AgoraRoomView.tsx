'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from 'react'
import type { IAgoraRTCRemoteUser, ILocalAudioTrack, ILocalVideoTrack } from 'agora-rtc-sdk-ng'
import {
  Camera,
  CameraOff,
  ExternalLink,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Pin,
  User,
  Volume2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export type ScreenTrack = ILocalVideoTrack | [ILocalVideoTrack, ILocalAudioTrack] | null
export type PinnedParticipant = number | 'local' | null

interface AgoraRoomViewProps {
  className?: string
  pipWindow: Window | null
  closeDocumentPiP: () => void
  localVideoDivRef: RefObject<HTMLDivElement | null>
  pinnedLocalVideoRef: RefObject<HTMLDivElement | null>
  remoteUsers: IAgoraRTCRemoteUser[]
  roster: Record<number, string>
  screenShareUids: number[]
  screenTrack: ScreenTrack
  isMuted: boolean
  isCamOff: boolean
  isSharingScreen: boolean
  pinnedUid: PinnedParticipant
  setPinnedUid: Dispatch<SetStateAction<PinnedParticipant>>
  toggleMute: () => Promise<void>
  toggleCamera: () => Promise<void>
  toggleScreenShare: () => Promise<void>
  leaveChannel: () => Promise<void>
  hideEndCallButton?: boolean
  extraControls?: ReactNode
  overlayContent?: ReactNode
  audioPlaybackBlocked: boolean
  resumeRemoteAudio: () => Promise<void>
}

const isScreenShareUid = (
  uid: unknown,
  screenShareUids: number[],
): uid is number =>
  typeof uid === 'number' && screenShareUids.includes(uid)

export function AgoraRoomView({
  className,
  pipWindow,
  closeDocumentPiP,
  localVideoDivRef,
  pinnedLocalVideoRef,
  remoteUsers,
  roster,
  screenShareUids,
  screenTrack,
  isMuted,
  isCamOff,
  isSharingScreen,
  pinnedUid,
  setPinnedUid,
  toggleMute,
  toggleCamera,
  toggleScreenShare,
  leaveChannel,
  hideEndCallButton,
  extraControls,
  overlayContent,
  audioPlaybackBlocked,
  resumeRemoteAudio,
}: AgoraRoomViewProps) {
  const remoteScreenShare = remoteUsers.find((user) =>
    isScreenShareUid(user.uid, screenShareUids),
  )
  const activeScreenShare = remoteScreenShare || (
    isSharingScreen ? { uid: 'local_screen' as const, videoTrack: screenTrack } : null
  )
  const regularRemoteUsers = remoteUsers.filter((user) =>
    !isScreenShareUid(user.uid, screenShareUids),
  )
  const displayUid = pinnedUid ?? activeScreenShare?.uid ?? null
  const isTheaterLayout = displayUid !== null

  let presenterTitle = ''
  if (displayUid === 'local_screen') {
    presenterTitle = 'You are presenting'
  } else if (isScreenShareUid(displayUid, screenShareUids)) {
    presenterTitle = roster[displayUid] || `Screen share (${displayUid})`
  } else if (displayUid === 'local') {
    presenterTitle = 'You'
  } else if (displayUid !== null) {
    presenterTitle = roster[Number(displayUid)] || `Participant (${displayUid})`
  }

  return (
    <div className={`relative flex flex-col h-full min-h-[400px] bg-slate-950 overflow-hidden text-white ${className ?? 'rounded-2xl border border-slate-800 shadow-xl'}`}>
      <div className="flex-1 flex flex-col p-4 min-h-0 overflow-y-auto gap-4 justify-stretch">
        {pipWindow ? (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-auto space-y-4">
            <Monitor className="w-16 h-16 text-amber-500 animate-pulse" />
            <h3 className="text-xl font-bold text-slate-100">
              Picture-in-picture is open because you&apos;re screen sharing
            </h3>
            <p className="text-xs text-slate-400">
              Using picture-in-picture lets you see others in the call while you screen share.
            </p>
            <Button
              onClick={closeDocumentPiP}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-5 py-2 transition"
            >
              Bring the call back here
            </Button>
          </div>
        ) : isTheaterLayout && displayUid !== null ? (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-850 aspect-video flex-1 flex items-center justify-center shadow-lg">
              {displayUid === 'local' ? (
                <>
                  <div ref={pinnedLocalVideoRef} className="absolute inset-0 w-full h-full object-cover" />
                  {isCamOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                      <User className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </>
              ) : displayUid === 'local_screen' ? (
                <LocalScreenShareStage screenTrack={screenTrack} />
              ) : (
                <PinnedRemoteVideo user={remoteUsers.find((user) => user.uid === displayUid)} />
              )}

              {pinnedUid !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPinnedUid(null)}
                  className="absolute top-3 right-3 bg-black/60 border-white/10 hover:bg-black/80 rounded-lg text-white backdrop-blur-md z-20"
                >
                  Unpin Stage
                </Button>
              )}

              <span className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md text-xs font-semibold backdrop-blur-md border border-white/10 tracking-wide z-10">
                {presenterTitle}
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto py-2 shrink-0 min-h-[120px] scrollbar-thin">
              {pinnedUid !== 'local' && (
                <div
                  onClick={() => setPinnedUid('local')}
                  className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 w-44 aspect-video flex items-center justify-center cursor-pointer hover:border-slate-600 transition duration-300 shrink-0"
                >
                  <div ref={localVideoDivRef} className="absolute inset-0 w-full h-full object-cover" />
                  {isCamOff && <User className="w-6 h-6 text-slate-500" />}
                  <span className="absolute bottom-1 left-2 bg-black/60 px-2 py-0.5 rounded-md text-[10px] font-semibold">You</span>
                </div>
              )}

              {regularRemoteUsers.map((user) => {
                const displayName = roster[Number(user.uid)] || `Participant (${user.uid})`
                return pinnedUid !== user.uid && (
                  <div
                    key={user.uid}
                    onClick={() => setPinnedUid(Number(user.uid))}
                    className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 w-44 aspect-video flex items-center justify-center cursor-pointer hover:border-slate-600 transition duration-300 shrink-0"
                  >
                    <ThumbnailRemoteVideo user={user} />
                    <span className="absolute bottom-1 left-2 bg-black/60 px-2 py-0.5 rounded-md text-[10px] font-semibold max-w-[90%] truncate">
                      {displayName}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-850 aspect-video flex items-center justify-center shadow-inner">
              <div ref={localVideoDivRef} className="absolute inset-0 w-full h-full object-cover" />
              {isCamOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center shadow-lg border border-slate-700">
                    <User className="w-8 h-8 text-slate-400" />
                  </div>
                </div>
              )}
              <span className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md text-xs font-semibold backdrop-blur-md border border-white/10 tracking-wide z-10">
                You {isMuted && ' (Muted)'}
              </span>
            </div>

            {regularRemoteUsers.map((user) => (
              <RemoteVideoTile
                key={user.uid}
                user={user}
                onPin={() => setPinnedUid(Number(user.uid))}
                displayName={roster[Number(user.uid)] || `Participant (${user.uid})`}
              />
            ))}

            {regularRemoteUsers.length === 0 && (
              <div className="flex items-center justify-center rounded-xl bg-slate-900/30 border border-dashed border-slate-800/80 p-8 text-center text-slate-500 text-sm md:col-span-2">
                Waiting for other participants to join...
              </div>
            )}
          </div>
        )}
      </div>

      {overlayContent}

      {audioPlaybackBlocked && (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border border-amber-400/40 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
          <Button
            type="button"
            onClick={resumeRemoteAudio}
            className="bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            Enable call audio
          </Button>
        </div>
      )}

      {!pipWindow && (
        <div className="bg-slate-900/70 backdrop-blur-md border-t border-slate-800/60 px-6 py-4 flex items-center justify-center gap-4 shrink-0">
          <Button variant={isMuted ? 'destructive' : 'outline'} size="icon" onClick={toggleMute} className="rounded-full w-12 h-12 shadow-md transition-all duration-300 hover:scale-105">
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button variant={isCamOff ? 'destructive' : 'outline'} size="icon" onClick={toggleCamera} className="rounded-full w-12 h-12 shadow-md transition-all duration-300 hover:scale-105">
            {isCamOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          </Button>
          <Button variant={isSharingScreen ? 'default' : 'outline'} size="icon" onClick={toggleScreenShare} className="rounded-full w-12 h-12 shadow-md transition-all duration-300 hover:scale-105">
            <Monitor className="w-5 h-5" />
          </Button>
          {!hideEndCallButton && (
            <Button variant="destructive" size="icon" onClick={leaveChannel} className="rounded-full w-12 h-12 shadow-md transition-all duration-300 hover:scale-105">
              <PhoneOff className="w-5 h-5" />
            </Button>
          )}
          {extraControls}
        </div>
      )}

      {pipWindow && createPortal(
        <div className="flex flex-col h-full bg-slate-950 p-4 text-white font-sans overflow-hidden select-none">
          <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-2">
            <span className="text-xs font-semibold tracking-wide text-slate-300">Live Meeting</span>
            <span className="text-[10px] bg-red-600/80 px-2 py-0.5 rounded-full font-bold animate-pulse text-white uppercase tracking-wider">Presenting</span>
          </div>
          <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto mb-3 scrollbar-none">
            {regularRemoteUsers.map((user) => {
              const displayName = roster[Number(user.uid)] || `Participant (${user.uid})`
              return (
                <div key={user.uid} className="relative rounded-xl overflow-hidden aspect-video bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                  <ThumbnailRemoteVideo user={user} />
                  <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide">{displayName}</span>
                </div>
              )
            })}
            {regularRemoteUsers.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-850 rounded-xl p-4">
                No remote video streams active
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 shrink-0 py-2 border-t border-slate-900">
            <button onClick={toggleMute} className={`w-9 h-9 rounded-full flex items-center justify-center border cursor-pointer transition ${isMuted ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'}`}>
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button onClick={toggleCamera} className={`w-9 h-9 rounded-full flex items-center justify-center border cursor-pointer transition ${isCamOff ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'}`}>
              {isCamOff ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            </button>
            <button onClick={toggleScreenShare} className="w-9 h-9 rounded-full flex items-center justify-center bg-red-600 border border-red-600 text-white cursor-pointer transition hover:bg-red-700" title="Stop Sharing">
              <Monitor className="w-4 h-4" />
            </button>
          </div>
        </div>,
        pipWindow.document.body,
      )}
    </div>
  )
}

function LocalScreenShareStage({ screenTrack }: { screenTrack: ScreenTrack }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const track = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack
    if (track && containerRef.current) track.play(containerRef.current)
    return () => track?.stop()
  }, [screenTrack])
  return <div ref={containerRef} className="absolute inset-0 w-full h-full object-contain bg-black" />
}

function PinnedRemoteVideo({ user }: { user?: IAgoraRTCRemoteUser }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (user?.videoTrack && containerRef.current) user.videoTrack.play(containerRef.current)
  }, [user?.videoTrack, user?.uid])
  return (
    <>
      <div ref={containerRef} className="absolute inset-0 w-full h-full object-contain bg-black" />
      {!user?.videoTrack && <VideoPlaceholder large />}
    </>
  )
}

function ThumbnailRemoteVideo({ user }: { user: IAgoraRTCRemoteUser }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (user.videoTrack && containerRef.current) user.videoTrack.play(containerRef.current)
  }, [user.videoTrack, user.uid])
  return (
    <>
      <div ref={containerRef} className="absolute inset-0 w-full h-full object-cover" />
      {!user.videoTrack && <div className="absolute inset-0 flex items-center justify-center bg-slate-900"><User className="w-6 h-6 text-slate-500" /></div>}
    </>
  )
}

function RemoteVideoTile({ user, onPin, displayName }: { user: IAgoraRTCRemoteUser; onPin: () => void; displayName: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (user.videoTrack && containerRef.current) user.videoTrack.play(containerRef.current)
    return () => user.videoTrack?.stop()
  }, [user.videoTrack])

  const togglePiP = async (event: React.MouseEvent) => {
    event.stopPropagation()
    const video = containerRef.current?.querySelector('video')
    if (!video) return toast.error('No active video stream found.')
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else if (document.pictureInPictureEnabled) await video.requestPictureInPicture()
      else toast.error('Picture-in-Picture is not supported by your browser.')
    } catch {
      toast.error('Failed to open Picture-in-Picture.')
    }
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-850 aspect-video flex items-center justify-center shadow-inner group">
      <div ref={containerRef} className="absolute inset-0 w-full h-full object-cover" />
      {!user.videoTrack && <VideoPlaceholder />}
      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
        <button onClick={onPin} className="p-2 bg-black/60 hover:bg-black/80 rounded-lg border border-white/10 backdrop-blur-md cursor-pointer shadow-md text-white" title="Pin to Stage">
          <Pin className="w-4 h-4" />
        </button>
        {user.videoTrack && (
          <button onClick={togglePiP} className="p-2 bg-black/60 hover:bg-black/80 rounded-lg border border-white/10 backdrop-blur-md cursor-pointer shadow-md text-white" title="Picture in Picture">
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
      <span className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md text-xs font-semibold backdrop-blur-md border border-white/10 tracking-wide z-10">{displayName}</span>
    </div>
  )
}

function VideoPlaceholder({ large = false }: { large?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
      <div className={`${large ? 'w-24 h-24' : 'w-16 h-16'} rounded-full bg-slate-800 flex items-center justify-center shadow-lg border border-slate-700`}>
        <User className={`${large ? 'w-12 h-12' : 'w-8 h-8'} text-slate-400`} />
      </div>
    </div>
  )
}
