'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng'
import { agoraService } from '@/services/agoraService'
import { ActiveSpeakerCollector } from '@/services/attributionService'
import type { AgoraTokenData } from '@/services/agoraService'
import { toast } from 'sonner'
import {
  AgoraRoomView,
  type PinnedParticipant,
  type ScreenTrack,
} from '@/components/agora/components/AgoraRoomView'

export interface AgoraVideoRoomProps {
  sessionId: string
  onLeave?: () => void
  /** Extra buttons to inject into the control bar (e.g. Q&A toggle) */
  extraControls?: React.ReactNode
  /** Content to overlay on top of the video grid (e.g. slide-out Q&A panel) */
  overlayContent?: React.ReactNode
  /** Additional CSS classes for the root container */
  className?: string
  /** Called whenever the mic is toggled. isMuted=true means mic is now OFF (answer recording should stop). */
  onMicToggle?: (isMuted: boolean) => void
  /** Called once the local camera/mic tracks are live — e.g. to start session recording from the same capture pipeline. */
  onLocalTracks?: (videoTrack: unknown, audioTrack: unknown) => void
  /** Toast shown when a remote participant joins (e.g. "Examiner joining now" on the student side). */
  remoteJoinNotice?: string
  /** Called whenever this user starts/stops sharing their screen. Lets the parent
   * show controls (e.g. "End Demo") only to the participant who is presenting. */
  onScreenShareChange?: (isSharing: boolean, track: ScreenTrack) => void
  /** If true, the local microphone will be disabled immediately upon initialization (useful for observers). */
  initialMute?: boolean
  /** If true, the local camera will be disabled immediately upon initialization. */
  initialCamOff?: boolean
  /** If true, hides the default red PhoneOff end call button. */
  hideEndCallButton?: boolean
  /** Controls the local call microphone for role-specific flows. */
  micEnabledOverride?: boolean
  /** Reports real remote speech so local answer transcription can pause and
   * never capture another participant through the speakers. */
  onRemoteAudioActivity?: (active: boolean) => void
}

type DocumentPictureInPictureApi = {
  requestWindow(options: { width: number; height: number }): Promise<Window>
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function screenTracks(track: ScreenTrack): Array<ILocalVideoTrack | ILocalAudioTrack> {
  if (!track) return []
  return Array.isArray(track) ? track : [track]
}

function closeScreenTrack(track: ScreenTrack) {
  for (const mediaTrack of screenTracks(track)) {
    mediaTrack.stop()
    mediaTrack.close()
  }
}

export default function AgoraVideoRoom({ sessionId, onLeave, extraControls, overlayContent, className, onMicToggle, onLocalTracks, remoteJoinNotice, onScreenShareChange, initialMute, initialCamOff, hideEndCallButton, micEnabledOverride, onRemoteAudioActivity }: AgoraVideoRoomProps) {
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null)
  // Refs keep the join effect's dependency list unchanged ([sessionId]).
  const onLocalTracksRef = useRef(onLocalTracks)
  const remoteJoinNoticeRef = useRef(remoteJoinNotice)
  const onScreenShareChangeRef = useRef(onScreenShareChange)
  const onRemoteAudioActivityRef = useRef(onRemoteAudioActivity)
  const onMicToggleRef = useRef(onMicToggle)

  useEffect(() => {
    onLocalTracksRef.current = onLocalTracks
    remoteJoinNoticeRef.current = remoteJoinNotice
    onScreenShareChangeRef.current = onScreenShareChange
    onRemoteAudioActivityRef.current = onRemoteAudioActivity
    onMicToggleRef.current = onMicToggle
  })
  const noticedUidsRef = useRef<Set<string | number>>(new Set())

  /**
   * Tell the parent its cached track references are dead.
   *
   * Closing an Agora track tears down its internals, so any later call on it
   * (`setEnabled`, `getMediaStreamTrack`) throws from deep inside the SDK —
   * "mutex property key _enabledMutex doesn't exist on MicrophoneAudioTrack".
   * The parent cannot know a track was closed unless it is told, so every
   * teardown path announces it.
   */
  const releaseLocalTracks = useCallback(() => {
    onLocalTracksRef.current?.(null, null)
  }, [])
  const [screenTrack, setScreenTrack] = useState<ScreenTrack>(null)
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([])
  const [roster, setRoster] = useState<Record<number, string>>({})
  const [screenShareUids, setScreenShareUids] = useState<number[]>([])
  const [isJoined, setIsJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(initialMute ?? false)
  const [isCamOff, setIsCamOff] = useState(initialCamOff ?? false)
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false)
  const [pinnedUid, setPinnedUid] = useState<PinnedParticipant>(null)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  const clientRef = useRef<IAgoraRTCClient | null>(null)
  // Speaker attribution: coalesces Agora's volume ticks into speaking spans so
  // the backend can tell who answered each question. Agora reports per-UID
  // levels because every student publishes from their own device, and the UID
  // maps deterministically back to a student.
  const speakerCollectorRef = useRef<ActiveSpeakerCollector | null>(null)
  const screenClientRef = useRef<IAgoraRTCClient | null>(null)
  const credentialsRef = useRef<AgoraTokenData | null>(null)
  const localVideoDivRef = useRef<HTMLDivElement>(null)
  const pinnedLocalVideoRef = useRef<HTMLDivElement>(null)

  // Use refs for tracks to avoid React stale-closure bugs during component unmounts
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null)
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null)
  const screenTrackRef = useRef<ScreenTrack>(null)

  useEffect(() => {
    if (micEnabledOverride === undefined || !isJoined) return
    const audioTrack = localAudioTrackRef.current
    if (!audioTrack) return
    void audioTrack.setEnabled(micEnabledOverride).then(() => {
      setIsMuted(!micEnabledOverride)
      onMicToggleRef.current?.(!micEnabledOverride)
    }).catch(() => {
      toast.error('Examiner microphone could not be enabled.')
    })
  }, [micEnabledOverride, isJoined])

  // Redirect local video stream output depending on whether we are pinned or thumbnail
  useEffect(() => {
    if (localVideoTrack && !isCamOff && !isSharingScreen && !pipWindow) {
      if (pinnedUid === 'local' && pinnedLocalVideoRef.current) {
        localVideoTrack.play(pinnedLocalVideoRef.current)
      } else if (pinnedUid !== 'local' && localVideoDivRef.current) {
        localVideoTrack.play(localVideoDivRef.current)
      }
    }
  }, [localVideoTrack, pinnedUid, isCamOff, isSharingScreen, pipWindow])

  // Open HTML5 Document Picture-in-Picture window
  const openDocumentPiP = async () => {
    const documentPiP = (
      window as Window & { documentPictureInPicture?: DocumentPictureInPictureApi }
    ).documentPictureInPicture
    if (!documentPiP) {
      toast.error('Document Picture-in-Picture is not supported by your browser. Please use Chrome/Edge.')
      return
    }

    try {
      const pip = await documentPiP.requestWindow({
        width: 360,
        height: 480,
      })

      // Copy parent page stylesheets to the PiP window so styling looks correct
      const styleSheets = Array.from(document.styleSheets)
      styleSheets.forEach((sheet) => {
        try {
          const cssRules = Array.from(sheet.cssRules).map((rule) => rule.cssText).join('')
          const style = document.createElement('style')
          style.textContent = cssRules
          pip.document.head.appendChild(style)
        } catch {
          // Skip cross-origin stylesheets that block access
        }
      })

      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      links.forEach((link) => {
        const cloned = link.cloneNode(true)
        pip.document.head.appendChild(cloned)
      })

      setPipWindow(pip)

      pip.addEventListener('pagehide', () => {
        setPipWindow(null)
      })
    } catch {
      toast.error('Failed to open floating window.')
    }
  }

  const closeDocumentPiP = () => {
    if (pipWindow) {
      pipWindow.close()
      setPipWindow(null)
    }
  }

  // Auto trigger PiP window when screen sharing begins
  useEffect(() => {
    if (isSharingScreen) {
      openDocumentPiP()
    } else {
      closeDocumentPiP()
    }
    return () => {
      closeDocumentPiP()
    }
    // PiP follows the screen-share transition; callback identity is intentionally ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSharingScreen])

  // Notify the parent when this user's screen-share state changes.
  useEffect(() => {
    onScreenShareChangeRef.current?.(isSharingScreen, screenTrack)
  }, [isSharingScreen, screenTrack])

  useEffect(() => {
    let active = true
    let restoreAudioAutoplayHandler: (() => void) | null = null
    const remoteAudioTracks = new Map<string | number, IRemoteAudioTrack>()
    let remoteAudioMonitorId: number | null = null
    let remoteAudioWasActive = false
    let remoteAudioLastHeardAt = 0

    const initAgora = async () => {
      try {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
        const previousAudioAutoplayHandler = AgoraRTC.onAudioAutoplayFailed
        AgoraRTC.onAudioAutoplayFailed = () => {
          if (active) setAudioPlaybackBlocked(true)
          previousAudioAutoplayHandler?.()
        }
        restoreAudioAutoplayHandler = () => {
          if (AgoraRTC.onAudioAutoplayFailed !== previousAudioAutoplayHandler) {
            AgoraRTC.onAudioAutoplayFailed = previousAudioAutoplayHandler
          }
        }

        // ── CRITICAL: Clean up any previous session BEFORE creating a new one ──
        // This handles React StrictMode double-mount and hot-reload scenarios.
        // We must fully disconnect the old client so the UID is freed on the server.
        if (localAudioTrackRef.current) {
          try { localAudioTrackRef.current.stop(); localAudioTrackRef.current.close() } catch { /* Best-effort cleanup. */ }
          localAudioTrackRef.current = null
          releaseLocalTracks()
        }
        if (localVideoTrackRef.current) {
          try { localVideoTrackRef.current.stop(); localVideoTrackRef.current.close() } catch { /* Best-effort cleanup. */ }
          localVideoTrackRef.current = null
        }
        if (screenTrackRef.current) {
          try { closeScreenTrack(screenTrackRef.current) } catch { /* Best-effort cleanup. */ }
          screenTrackRef.current = null
        }
        if (clientRef.current) {
          try { await clientRef.current.leave() } catch { /* The client may already be disconnected. */ }
          clientRef.current = null
        }

        // After cleanup, bail out if the component was already unmounted
        if (!active) return

        // ── Create a fresh client ──────────────────────────────────────────
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        clientRef.current = client

        // Poll the decoded remote tracks directly. This reacts much faster
        // than Agora's volume-indicator event and lets the student speech
        // recognizer stop before room audio can echo into an answer.
        remoteAudioMonitorId = window.setInterval(() => {
          const heardNow = [...remoteAudioTracks.values()].some((track) => {
            try {
              return track.getVolumeLevel() >= 0.015
            } catch {
              return false
            }
          })
          if (heardNow) remoteAudioLastHeardAt = Date.now()
          const remoteActive = Date.now() - remoteAudioLastHeardAt < 600
          if (remoteActive !== remoteAudioWasActive) {
            remoteAudioWasActive = remoteActive
            onRemoteAudioActivityRef.current?.(remoteActive)
          }
        }, 100)

        // Fetch token and roster from backend
        const credentials = await agoraService.getAgoraToken(sessionId)
        if (!active) return
        credentialsRef.current = credentials

        try {
          const rosterData = await agoraService.getAgoraRoster(sessionId)
          if (active) {
            setRoster(rosterData.roster)
            setScreenShareUids(rosterData.screenShareUids)
          }
        } catch {
          // Participant names are optional; numeric UIDs remain available.
        }

        // ── Speaker attribution ────────────────────────────────────────────
        // Report who is speaking, so each answer can be credited to the right
        // student. Wrapped defensively: attribution is decision-support, and
        // must never be able to break the call itself.
        try {
          const collector = new ActiveSpeakerCollector(sessionId, credentials.uid)
          speakerCollectorRef.current = collector
          collector.start()
          client.enableAudioVolumeIndicator()
          client.on('volume-indicator', (volumes) => {
            speakerCollectorRef.current?.observe(
              volumes.map((v) => ({ uid: v.uid, level: v.level })),
            )
          })
        } catch {
          // The call remains usable when attribution is unavailable.
        }

        // Set up event listeners
        client.on('user-joined', (user) => {
          // Pre-notice ("Examiner joining now") — once per participant.
          const notice = remoteJoinNoticeRef.current
          if (notice && !noticedUidsRef.current.has(user.uid)) {
            noticedUidsRef.current.add(user.uid)
            toast.info(notice, { duration: 5000 })
          }
          // Add user immediately on join
          setRemoteUsers((prev) => {
            if (prev.find((u) => u.uid === user.uid)) return prev
            return [...prev, user]
          })
        })

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType)
          if (mediaType === 'video') {
            setRemoteUsers((prev) => {
              if (prev.find((u) => u.uid === user.uid)) {
                return prev.map((u) => u.uid === user.uid ? user : u)
              }
              return [...prev, user]
            })
          }
          if (mediaType === 'audio') {
            if (user.audioTrack) {
              remoteAudioTracks.set(user.uid, user.audioTrack)
              user.audioTrack.play()
            }
          }
        })

        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            // Keep the user in the roster, but clear the videoTrack so the UI displays the avatar placeholder
            setRemoteUsers((prev) => prev.map((u) => u.uid === user.uid ? { ...u, videoTrack: undefined } : u))
          }
          if (mediaType === 'audio') remoteAudioTracks.delete(user.uid)
        })

        client.on('user-left', (user) => {
          remoteAudioTracks.delete(user.uid)
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid))
          setPinnedUid((prev) => (prev === user.uid ? null : prev))
        })

        // Join channel
        await client.join(
          credentials.app_id,
          credentials.channel,
          credentials.token,
          credentials.uid
        )
        if (!active) {
          await client.leave()
          clientRef.current = null
          return
        }

        // Create local tracks INDEPENDENTLY so a single device failure doesn't block the call
        let audioTrack: IMicrophoneAudioTrack | null = null
        let videoTrack: ICameraVideoTrack | null = null

        // Try microphone — if default device fails, try each available audio input
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
        } catch {
          // Enumerate all audio input devices and try each one
          try {
            const devices = await AgoraRTC.getDevices()
            const audioInputs = devices.filter((device) => device.kind === 'audioinput' && device.deviceId !== 'default' && device.deviceId !== 'communications')
            for (const device of audioInputs) {
              try {
                audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ microphoneId: device.deviceId })
                if (active) toast.success(`Microphone connected: ${device.label}`)
                break
              } catch {
                // Try the next available microphone.
              }
            }
          } catch {
            // Device enumeration can be blocked by browser privacy settings.
          }
          if (!audioTrack) {
            if (active) toast.warning('No working microphone found. You can still join with video only.')
          }
        }

        // Try camera
        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack()
        } catch {
          if (active) toast.warning('Camera unavailable. You can still join with audio only.')
        }

        if (!active) {
          if (audioTrack) { audioTrack.stop(); audioTrack.close() }
          if (videoTrack) { videoTrack.stop(); videoTrack.close() }
          releaseLocalTracks()
          await client.leave()
          clientRef.current = null
          return
        }

        if (!audioTrack && !videoTrack) {
          if (active) toast.error('Neither camera nor microphone could be accessed. Check your system privacy settings and ensure no other app is using them.')
          await client.leave()
          clientRef.current = null
          return
        }

        if (audioTrack) {
          localAudioTrackRef.current = audioTrack
          if (initialMute) {
            await audioTrack.setEnabled(false)
          }
        } else {
          setIsMuted(true)
        }

        if (videoTrack) {
          localVideoTrackRef.current = videoTrack
          setLocalVideoTrack(videoTrack)
          if (initialCamOff) {
            await videoTrack.setEnabled(false)
          }
          if (localVideoDivRef.current) {
            videoTrack.play(localVideoDivRef.current)
          }
        } else {
          setIsCamOff(true)
        }

        // Publish whichever tracks we have
        const tracksToPublish: Array<IMicrophoneAudioTrack | ICameraVideoTrack> = []
        if (audioTrack) tracksToPublish.push(audioTrack)
        if (videoTrack) tracksToPublish.push(videoTrack)
        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish)
        }

        if (active) {
          setIsJoined(true)
          onLocalTracksRef.current?.(videoTrack ?? null, audioTrack ?? null)
          toast.success('Joined live meeting room.')
        }
      } catch (error: unknown) {
        if (active) {
          toast.error(getErrorMessage(error, 'Failed to connect to video room.'))
        }
      }
    }

    initAgora()

    return () => {
      active = false
      restoreAudioAutoplayHandler?.()
      if (remoteAudioMonitorId !== null) {
        window.clearInterval(remoteAudioMonitorId)
        remoteAudioMonitorId = null
      }
      remoteAudioTracks.clear()
      if (remoteAudioWasActive) onRemoteAudioActivityRef.current?.(false)
      // Fire-and-forget cleanup (the NEXT mount's initAgora will await cleanup before proceeding)
      const cleanup = async () => {
        if (speakerCollectorRef.current) {
          // Closes any open speaking span and posts the tail, so the last
          // answer of the session is attributed like every other one.
          try {
            await speakerCollectorRef.current.stop()
          } catch {
            // Best-effort evidence flush during room teardown.
          }
          speakerCollectorRef.current = null
        }
        if (localAudioTrackRef.current) {
          try { localAudioTrackRef.current.stop(); localAudioTrackRef.current.close() } catch { /* Best-effort cleanup. */ }
          localAudioTrackRef.current = null
          releaseLocalTracks()
        }
        if (localVideoTrackRef.current) {
          try { localVideoTrackRef.current.stop(); localVideoTrackRef.current.close() } catch { /* Best-effort cleanup. */ }
          localVideoTrackRef.current = null
        }
        if (screenTrackRef.current) {
          try { closeScreenTrack(screenTrackRef.current) } catch { /* Best-effort cleanup. */ }
          screenTrackRef.current = null
        }
        if (screenClientRef.current) {
          try { await screenClientRef.current.leave() } catch { /* The client may already be disconnected. */ }
          screenClientRef.current = null
        }
        if (clientRef.current) {
          try { await clientRef.current.leave() } catch { /* The client may already be disconnected. */ }
          clientRef.current = null
        }
      }
      cleanup()
    }
    // Reconnect only when the session changes; initial device preferences are mount-time options.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const leaveChannel = async () => {
    try {
      closeDocumentPiP()

      // Safely stop and close tracks using direct references to avoid state closures
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop()
        localAudioTrackRef.current.close()
        localAudioTrackRef.current = null
        releaseLocalTracks()
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop()
        localVideoTrackRef.current.close()
        localVideoTrackRef.current = null
      }
      if (screenTrackRef.current) {
        closeScreenTrack(screenTrackRef.current)
        screenTrackRef.current = null
      }

      setLocalVideoTrack(null)
      setScreenTrack(null)

      if (screenClientRef.current) {
        try { await screenClientRef.current.leave() } catch { /* The client may already be disconnected. */ }
        screenClientRef.current = null
      }
      if (clientRef.current) {
        await clientRef.current.leave()
      }
      setIsJoined(false)
      if (onLeave) onLeave()
    } catch {
      toast.error('Failed to leave the video room cleanly.')
    }
  }

  const toggleMute = async () => {
    const audioTrack = localAudioTrackRef.current
    if (!audioTrack) return
    try {
      const nextMuted = !isMuted
      await audioTrack.setEnabled(isMuted) // setEnabled(true) = unmute, setEnabled(false) = mute
      setIsMuted(nextMuted)
      // Notify parent so speech recognition can start/stop in sync
      onMicToggle?.(nextMuted)
    } catch {
      toast.error('Failed to toggle microphone.')
    }
  }

  const resumeRemoteAudio = async () => {
    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
      AgoraRTC.resumeAudioContext()
      for (const user of remoteUsers) user.audioTrack?.play()
      setAudioPlaybackBlocked(false)
    } catch {
      toast.error('Could not enable call audio. Check the browser sound permission.')
    }
  }

  const toggleCamera = async () => {
    const videoTrack = localVideoTrackRef.current
    if (!videoTrack) return
    try {
      await videoTrack.setEnabled(isCamOff)
      setIsCamOff(!isCamOff)
    } catch {
      toast.error('Failed to toggle camera.')
    }
  }

  const toggleScreenShare = async () => {
    if (!clientRef.current || !isJoined || !credentialsRef.current) return

    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
      const creds = credentialsRef.current

      if (isSharingScreen) {
        if (screenTrackRef.current) {
          if (screenClientRef.current) {
            try {
              await screenClientRef.current.unpublish(screenTrackRef.current)
            } catch {
              // Continue cleanup even if unpublish races with a remote leave.
            }
          }

          closeScreenTrack(screenTrackRef.current)
          screenTrackRef.current = null
        }

        if (screenClientRef.current) {
          try {
            await screenClientRef.current.leave()
          } catch {
            // The screen client may already be disconnected.
          }
          screenClientRef.current = null
        }

        setScreenTrack(null)
        setIsSharingScreen(false)
        if (onScreenShareChangeRef.current) {
          onScreenShareChangeRef.current(false, null)
        }
      } else {
        if (!creds.screen_share_token || !creds.screen_share_uid) {
          toast.error('Screen sharing is not configured. Missing credentials from backend.')
          return
        }

        const screenTrackResult = await AgoraRTC.createScreenVideoTrack({}, 'auto')
        screenTrackRef.current = screenTrackResult
        setScreenTrack(screenTrackResult)

        // Create and connect the secondary screen sharing client
        const screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        screenClientRef.current = screenClient

        await screenClient.join(
          creds.app_id,
          creds.channel,
          creds.screen_share_token,
          creds.screen_share_uid
        )

        await screenClient.publish(screenTrackResult)

        const videoTrack = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult
        videoTrack.on('track-ended', () => {
          void toggleScreenShare()
        })

        setIsSharingScreen(true)
        if (onScreenShareChangeRef.current) {
          onScreenShareChangeRef.current(true, screenTrackResult)
        }
      }
    } catch {
      toast.error('Failed to share screen.')
    }
  }

  return (
    <AgoraRoomView
      className={className}
      pipWindow={pipWindow}
      closeDocumentPiP={closeDocumentPiP}
      localVideoDivRef={localVideoDivRef}
      pinnedLocalVideoRef={pinnedLocalVideoRef}
      remoteUsers={remoteUsers}
      roster={roster}
      screenShareUids={screenShareUids}
      screenTrack={screenTrack}
      isMuted={isMuted}
      isCamOff={isCamOff}
      isSharingScreen={isSharingScreen}
      pinnedUid={pinnedUid}
      setPinnedUid={setPinnedUid}
      toggleMute={toggleMute}
      toggleCamera={toggleCamera}
      toggleScreenShare={toggleScreenShare}
      leaveChannel={leaveChannel}
      hideEndCallButton={hideEndCallButton}
      extraControls={extraControls}
      overlayContent={overlayContent}
      audioPlaybackBlocked={audioPlaybackBlocked}
      resumeRemoteAudio={resumeRemoteAudio}
    />
  )
}
