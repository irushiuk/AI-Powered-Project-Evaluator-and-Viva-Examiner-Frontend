'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
} from 'lucide-react'
import { agoraService } from '@/services/agoraService'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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
  onScreenShareChange?: (isSharing: boolean, track: any) => void
  /** If true, the local microphone will be disabled immediately upon initialization (useful for observers). */
  initialMute?: boolean
  /** If true, the local camera will be disabled immediately upon initialization. */
  initialCamOff?: boolean
  /** If true, hides the default red PhoneOff end call button. */
  hideEndCallButton?: boolean
}

export default function AgoraVideoRoom({ sessionId, onLeave, extraControls, overlayContent, className, onMicToggle, onLocalTracks, remoteJoinNotice, onScreenShareChange, initialMute, initialCamOff, hideEndCallButton }: AgoraVideoRoomProps) {
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null)
  const [localAudioTrack, setLocalAudioTrack] = useState<any>(null)
  // Refs keep the join effect's dependency list unchanged ([sessionId]).
  const onLocalTracksRef = useRef(onLocalTracks)
  onLocalTracksRef.current = onLocalTracks
  const remoteJoinNoticeRef = useRef(remoteJoinNotice)
  remoteJoinNoticeRef.current = remoteJoinNotice
  const onScreenShareChangeRef = useRef(onScreenShareChange)
  onScreenShareChangeRef.current = onScreenShareChange
  const noticedUidsRef = useRef<Set<string | number>>(new Set())
  const [screenTrack, setScreenTrack] = useState<any>(null)
  const [remoteUsers, setRemoteUsers] = useState<any[]>([])
  const [roster, setRoster] = useState<Record<number, string>>({})
  const [isJoined, setIsJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(initialMute ?? false)
  const [isCamOff, setIsCamOff] = useState(initialCamOff ?? false)
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [pinnedUid, setPinnedUid] = useState<number | 'local' | null>(null)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  const clientRef = useRef<any>(null)
  const screenClientRef = useRef<any>(null)
  const credentialsRef = useRef<any>(null)
  const localVideoDivRef = useRef<HTMLDivElement>(null)
  const pinnedLocalVideoRef = useRef<HTMLDivElement>(null)

  // Use refs for tracks to avoid React stale-closure bugs during component unmounts
  const localAudioTrackRef = useRef<any>(null)
  const localVideoTrackRef = useRef<any>(null)
  const screenTrackRef = useRef<any>(null)

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
    if (!('documentPictureInPicture' in window)) {
      toast.error('Document Picture-in-Picture is not supported by your browser. Please use Chrome/Edge.')
      return
    }

    try {
      const pip = await (window as any).documentPictureInPicture.requestWindow({
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
        } catch (e) {
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
    } catch (err) {
      console.error('Failed to open Document PiP:', err)
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
  }, [isSharingScreen])

  // Notify the parent when this user's screen-share state changes.
  useEffect(() => {
    onScreenShareChangeRef.current?.(isSharingScreen, screenTrack)
  }, [isSharingScreen, screenTrack])

  useEffect(() => {
    let active = true

    const initAgora = async () => {
      try {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default

        // ── CRITICAL: Clean up any previous session BEFORE creating a new one ──
        // This handles React StrictMode double-mount and hot-reload scenarios.
        // We must fully disconnect the old client so the UID is freed on the server.
        if (localAudioTrackRef.current) {
          try { localAudioTrackRef.current.stop(); localAudioTrackRef.current.close() } catch (e) {}
          localAudioTrackRef.current = null
        }
        if (localVideoTrackRef.current) {
          try { localVideoTrackRef.current.stop(); localVideoTrackRef.current.close() } catch (e) {}
          localVideoTrackRef.current = null
        }
        if (screenTrackRef.current) {
          const st = screenTrackRef.current
          try {
            if (Array.isArray(st)) { st.forEach((t: any) => { t.stop(); t.close() }) }
            else { st.stop(); st.close() }
          } catch (e) {}
          screenTrackRef.current = null
        }
        if (clientRef.current) {
          try { await clientRef.current.leave() } catch (e) {}
          clientRef.current = null
        }

        // After cleanup, bail out if the component was already unmounted
        if (!active) return

        // ── Create a fresh client ──────────────────────────────────────────
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        clientRef.current = client

        // Fetch token and roster from backend
        const credentials = await agoraService.getAgoraToken(sessionId)
        if (!active) return
        credentialsRef.current = credentials

        try {
          const rosterMap = await agoraService.getAgoraRoster(sessionId)
          if (active) setRoster(rosterMap)
        } catch (err) {
          console.warn('Failed to load Agora roster names:', err)
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
            user.audioTrack?.play()
          }
        })

        client.on('user-unpublished', (user, mediaType) => {
          if (mediaType === 'video') {
            // Keep the user in the roster, but clear the videoTrack so the UI displays the avatar placeholder
            setRemoteUsers((prev) => prev.map((u) => u.uid === user.uid ? { ...u, videoTrack: undefined } : u))
          }
        })

        client.on('user-left', (user) => {
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
        let audioTrack: any = null
        let videoTrack: any = null

        // Try microphone — if default device fails, try each available audio input
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
        } catch (micErr: any) {
          console.warn('Default microphone failed:', micErr.message, '— trying alternative devices...')
          // Enumerate all audio input devices and try each one
          try {
            const devices = await AgoraRTC.getDevices()
            const audioInputs = devices.filter((d: any) => d.kind === 'audioinput' && d.deviceId !== 'default' && d.deviceId !== 'communications')
            for (const device of audioInputs) {
              try {
                audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ microphoneId: device.deviceId })
                console.log('Microphone connected via fallback device:', device.label)
                if (active) toast.success(`Microphone connected: ${device.label}`)
                break
              } catch (e) {
                console.warn(`Device "${device.label}" also failed, trying next...`)
              }
            }
          } catch (enumErr) {
            console.warn('Could not enumerate audio devices:', enumErr)
          }
          if (!audioTrack) {
            console.warn('All microphones failed.')
            if (active) toast.warning('No working microphone found. You can still join with video only.')
          }
        }

        // Try camera
        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack()
        } catch (camErr: any) {
          console.warn('Camera unavailable:', camErr.message)
          if (active) toast.warning('Camera unavailable. You can still join with audio only.')
        }

        if (!active) {
          if (audioTrack) { audioTrack.stop(); audioTrack.close() }
          if (videoTrack) { videoTrack.stop(); videoTrack.close() }
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
          setLocalAudioTrack(audioTrack)
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
        const tracksToPublish = [audioTrack, videoTrack].filter(Boolean)
        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish)
        }

        if (active) {
          setIsJoined(true)
          onLocalTracksRef.current?.(videoTrack ?? null, audioTrack ?? null)
          toast.success('Joined live meeting room.')
        }
      } catch (err: any) {
        console.error('Agora init error:', err)
        if (active) {
          toast.error(err.message || 'Failed to connect to video room.')
        }
      }
    }

    initAgora()

    return () => {
      active = false
      // Fire-and-forget cleanup (the NEXT mount's initAgora will await cleanup before proceeding)
      const cleanup = async () => {
        if (localAudioTrackRef.current) {
          try { localAudioTrackRef.current.stop(); localAudioTrackRef.current.close() } catch (e) {}
          localAudioTrackRef.current = null
        }
        if (localVideoTrackRef.current) {
          try { localVideoTrackRef.current.stop(); localVideoTrackRef.current.close() } catch (e) {}
          localVideoTrackRef.current = null
        }
        if (screenTrackRef.current) {
          const st = screenTrackRef.current
          try {
            if (Array.isArray(st)) { st.forEach((t: any) => { t.stop(); t.close() }) }
            else { st.stop(); st.close() }
          } catch (e) {}
          screenTrackRef.current = null
        }
        if (screenClientRef.current) {
          try { await screenClientRef.current.leave() } catch (e) {}
          screenClientRef.current = null
        }
        if (clientRef.current) {
          try { await clientRef.current.leave() } catch (e) {}
          clientRef.current = null
        }
      }
      cleanup()
    }
  }, [sessionId])

  const leaveChannel = async () => {
    try {
      closeDocumentPiP()

      // Safely stop and close tracks using direct references to avoid state closures
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop()
        localAudioTrackRef.current.close()
        localAudioTrackRef.current = null
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop()
        localVideoTrackRef.current.close()
        localVideoTrackRef.current = null
      }
      if (screenTrackRef.current) {
        const track = screenTrackRef.current
        if (Array.isArray(track)) {
          track.forEach((t: any) => {
            t.stop()
            t.close()
          })
        } else {
          track.stop()
          track.close()
        }
        screenTrackRef.current = null
      }

      setLocalAudioTrack(null)
      setLocalVideoTrack(null)
      setScreenTrack(null)

      if (screenClientRef.current) {
        try { await screenClientRef.current.leave() } catch (e) {}
        screenClientRef.current = null
      }
      if (clientRef.current) {
        await clientRef.current.leave()
      }
      setIsJoined(false)
      if (onLeave) onLeave()
    } catch (err) {
      console.error('Leave error:', err)
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
    } catch (err) {
      toast.error('Failed to toggle microphone.')
    }
  }

  const toggleCamera = async () => {
    const videoTrack = localVideoTrackRef.current
    if (!videoTrack) return
    try {
      await videoTrack.setEnabled(isCamOff)
      setIsCamOff(!isCamOff)
    } catch (err) {
      toast.error('Failed to toggle camera.')
    }
  }

  const toggleScreenShare = async () => {
    console.log('DEBUG AgoraVideoRoom: toggleScreenShare invoked. clientJoined:', isJoined, 'current isSharingScreen:', isSharingScreen)
    if (!clientRef.current || !isJoined || !credentialsRef.current) {
      console.log('DEBUG AgoraVideoRoom: toggleScreenShare aborted because clientRef, isJoined, or credentialsRef is falsy')
      return
    }

    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
      const creds = credentialsRef.current

      if (isSharingScreen) {
        console.log('DEBUG AgoraVideoRoom: Stopping screen share (secondary client)...')
        if (screenTrackRef.current) {
          if (screenClientRef.current) {
            try {
              console.log('DEBUG AgoraVideoRoom: Unpublishing from screenClient...')
              await screenClientRef.current.unpublish(screenTrackRef.current)
            } catch (err) {
              console.warn('Unpublish from screenClient failed:', err)
            }
          }
          
          const track = screenTrackRef.current
          if (Array.isArray(track)) {
            track.forEach((t: any) => {
              t.stop()
              t.close()
            })
          } else {
            track.stop()
            track.close()
          }
          screenTrackRef.current = null
        }

        if (screenClientRef.current) {
          try {
            await screenClientRef.current.leave()
          } catch (err) {
            console.warn('Leave from screenClient failed:', err)
          }
          screenClientRef.current = null
        }

        setScreenTrack(null)
        setIsSharingScreen(false)
        if (onScreenShareChangeRef.current) {
          console.log('DEBUG AgoraVideoRoom: notifying parent screen share stopped')
          onScreenShareChangeRef.current(false, null)
        }
      } else {
        if (!creds.screen_share_token || !creds.screen_share_uid) {
          toast.error('Screen sharing is not configured. Missing credentials from backend.')
          return
        }

        console.log('DEBUG AgoraVideoRoom: Calling AgoraRTC.createScreenVideoTrack({}, "auto")...')
        const screenTrackResult = await AgoraRTC.createScreenVideoTrack({}, 'auto')
        console.log('DEBUG AgoraVideoRoom: createScreenVideoTrack resolved successfully:', screenTrackResult)
        screenTrackRef.current = screenTrackResult
        setScreenTrack(screenTrackResult)

        // Create and connect the secondary screen sharing client
        console.log('DEBUG AgoraVideoRoom: Creating secondary screen share client...')
        const screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        screenClientRef.current = screenClient

        console.log('DEBUG AgoraVideoRoom: screenClient joining room...')
        await screenClient.join(
          creds.app_id,
          creds.channel,
          creds.screen_share_token,
          creds.screen_share_uid
        )

        console.log('DEBUG AgoraVideoRoom: publishing screen track to secondary client...')
        await screenClient.publish(screenTrackResult)
        console.log('DEBUG AgoraVideoRoom: published screen track successfully on secondary client')

        const videoTrack = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult;
        videoTrack.on('track-ended', () => {
          console.log('DEBUG AgoraVideoRoom: screen track ended via browser UI')
          toggleScreenShare()
        })

        setIsSharingScreen(true)
        if (onScreenShareChangeRef.current) {
          console.log('DEBUG AgoraVideoRoom: notifying parent screen share started')
          onScreenShareChangeRef.current(true, screenTrackResult)
        }
      }
    } catch (err) {
      console.error('DEBUG AgoraVideoRoom: Screen share error caught:', err)
      toast.error('Failed to share screen.')
    }
  }

  const isScreenShareUid = (uid: any) => typeof uid === 'number' && uid >= 1000000000
  const getRealUidFromScreenShare = (uid: number) => uid - 1000000000

  const remoteScreenShare = remoteUsers.find((u) => isScreenShareUid(u.uid))
  const activeScreenShare = remoteScreenShare || (isSharingScreen ? { uid: 'local_screen', videoTrack: screenTrack } : null)
  
  // Filter out screen share users from the regular video grid and thumbnail row
  const regularRemoteUsers = remoteUsers.filter((u) => !isScreenShareUid(u.uid))

  const isTheaterLayout = pinnedUid !== null || activeScreenShare !== null
  const displayUid = pinnedUid !== null ? pinnedUid : (activeScreenShare ? activeScreenShare.uid : null)

  let presenterTitle = ''
  if (displayUid === 'local_screen') {
    presenterTitle = 'You are presenting'
  } else if (displayUid !== null && isScreenShareUid(displayUid)) {
    const realUid = getRealUidFromScreenShare(displayUid as number)
    const ownerName = roster[realUid] || `Participant (${realUid})`
    presenterTitle = `${ownerName} is presenting`
  } else if (displayUid === 'local') {
    presenterTitle = 'You'
  } else if (displayUid !== null) {
    presenterTitle = roster[displayUid as number] || `Participant (${displayUid})`
  }

  return (
    <div className={`relative flex flex-col h-full min-h-[400px] bg-slate-950 overflow-hidden text-white ${className ?? 'rounded-2xl border border-slate-800 shadow-xl'}`}>
      {/* Video Container Area */}
      <div className="flex-1 flex flex-col p-4 min-h-0 overflow-y-auto gap-4 justify-stretch">
        
        {pipWindow ? (
          /* ==================================================================
             Google Meet Style Placeholder when Document PiP is open
             ================================================================== */
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-auto space-y-4">
            <Monitor className="w-16 h-16 text-amber-500 animate-pulse" />
            <h3 className="text-xl font-bold text-slate-100">
              Picture-in-picture is open because you're screen sharing
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
          /* ==================================================================
             Theater Layout (Someone is presenting or pinned)
             ================================================================== */
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
                <PinnedRemoteVideo 
                  user={remoteUsers.find(u => u.uid === displayUid)} 
                  displayName={presenterTitle}
                />
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

            {/* Thumbnails Row */}
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
                const displayName = roster[user.uid] || `Participant (${user.uid})`
                return pinnedUid !== user.uid && (
                  <div
                    key={user.uid}
                    onClick={() => setPinnedUid(user.uid)}
                    className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 w-44 aspect-video flex items-center justify-center cursor-pointer hover:border-slate-600 transition duration-300 shrink-0"
                  >
                    <ThumbnailRemoteVideo user={user} displayName={displayName} />
                    <span className="absolute bottom-1 left-2 bg-black/60 px-2 py-0.5 rounded-md text-[10px] font-semibold max-w-[90%] truncate">
                      {displayName}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ==================================================================
             Standard Grid Layout (Normal grid view)
             ================================================================== */
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
                onPin={() => setPinnedUid(user.uid)}
                displayName={roster[user.uid] || `Participant (${user.uid})`}
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

      {/* Overlay Content (e.g. Q&A Panel from parent) */}
      {overlayContent}

      {/* Control Bar */}
      {!pipWindow && (
        <div className="bg-slate-900/70 backdrop-blur-md border-t border-slate-800/60 px-6 py-4 flex items-center justify-center gap-4 shrink-0">
          <Button
            variant={isMuted ? 'destructive' : 'outline'}
            size="icon"
            onClick={toggleMute}
            className="rounded-full w-12 h-12 shadow-md transition-all duration-300 hover:scale-105"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant={isCamOff ? 'destructive' : 'outline'}
            size="icon"
            onClick={toggleCamera}
            className="rounded-full w-12 h-12 shadow-md transition-all duration-300 hover:scale-105"
          >
            {isCamOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          </Button>

          <Button
            variant={isSharingScreen ? 'default' : 'outline'}
            size="icon"
            onClick={toggleScreenShare}
            className="rounded-full w-12 h-12 shadow-md transition-all duration-300 hover:scale-105"
          >
            <Monitor className="w-5 h-5" />
          </Button>

          {!hideEndCallButton && (
            <Button
              variant="destructive"
              size="icon"
              onClick={leaveChannel}
              className="rounded-full w-12 h-12 shadow-md transition-all duration-300 hover:scale-105"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          )}

          {/* Extra controls injected by parent */}
          {extraControls}
        </div>
      )}

      {/* ==================================================================
         Document Picture-in-Picture React Portal
         ================================================================== */}
      {pipWindow && createPortal(
        <div className="flex flex-col h-full bg-slate-950 p-4 text-white font-sans overflow-hidden select-none">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-2">
            <span className="text-xs font-semibold tracking-wide text-slate-300">Live Meeting</span>
            <span className="text-[10px] bg-red-600/80 px-2 py-0.5 rounded-full font-bold animate-pulse text-white uppercase tracking-wider">
              Presenting
            </span>
          </div>

          {/* Videos Grid inside floating panel */}
          <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto mb-3 scrollbar-none">
            {regularRemoteUsers.map((user) => {
              const displayName = roster[user.uid] || `Participant (${user.uid})`;
              return (
                <div 
                  key={user.uid} 
                  className="relative rounded-xl overflow-hidden aspect-video bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner"
                >
                  <ThumbnailRemoteVideo user={user} displayName={displayName} />
                  <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide">
                    {displayName}
                  </span>
                </div>
              );
            })}
            
            {remoteUsers.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-850 rounded-xl p-4">
                No remote video streams active
              </div>
            )}
          </div>

          {/* Controls Bar inside floating panel */}
          <div className="flex items-center justify-center gap-3 shrink-0 py-2 border-t border-slate-900">
            <button
              onClick={toggleMute}
              className={`w-9 h-9 rounded-full flex items-center justify-center border cursor-pointer transition ${
                isMuted ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleCamera}
              className={`w-9 h-9 rounded-full flex items-center justify-center border cursor-pointer transition ${
                isCamOff ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {isCamOff ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-red-600 border border-red-600 text-white cursor-pointer transition hover:bg-red-700"
              title="Stop Sharing"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
        </div>,
        pipWindow.document.body
      )}

    </div>
  )
}

function LocalScreenShareStage({ screenTrack }: { screenTrack: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (screenTrack && containerRef.current) {
      const track = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack
      track.play(containerRef.current)
    }
    return () => {
      const track = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack
      track?.stop()
    }
  }, [screenTrack])

  return <div ref={containerRef} className="absolute inset-0 w-full h-full object-contain bg-black" />
}

function PinnedRemoteVideo({ user, displayName }: { user: any; displayName: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (user?.videoTrack && containerRef.current) {
      user.videoTrack.play(containerRef.current)
    }
  }, [user?.videoTrack, user?.uid])

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 w-full h-full object-contain bg-black" />
      {!user?.videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center shadow-lg border border-slate-700">
            <User className="w-12 h-12 text-slate-400" />
          </div>
        </div>
      )}
    </>
  )
}

function ThumbnailRemoteVideo({ user, displayName }: { user: any; displayName: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (user?.videoTrack && containerRef.current) {
      user.videoTrack.play(containerRef.current)
    }
  }, [user?.videoTrack, user?.uid])

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 w-full h-full object-cover" />
      {!user?.videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <User className="w-6 h-6 text-slate-500" />
        </div>
      )}
    </>
  )
}

interface RemoteVideoTileProps {
  user: any
  onPin: () => void
  displayName: string
}

function RemoteVideoTile({ user, onPin, displayName }: RemoteVideoTileProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user.videoTrack && containerRef.current) {
      user.videoTrack.play(containerRef.current)
    }
    return () => {
      user.videoTrack?.stop()
    }
  }, [user.videoTrack])

  const togglePiP = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!containerRef.current) return
    const video = containerRef.current.querySelector('video')
    if (!video) {
      toast.error('No active video stream found.')
      return
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture()
      } else {
        toast.error('Picture-in-Picture is not supported by your browser.')
      }
    } catch (err) {
      console.error('PiP error:', err)
      toast.error('Failed to open Picture-in-Picture.')
    }
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-850 aspect-video flex items-center justify-center shadow-inner group">
      <div ref={containerRef} className="absolute inset-0 w-full h-full object-cover" />
      
      {!user.videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center shadow-lg border border-slate-700">
            <User className="w-8 h-8 text-slate-400" />
          </div>
        </div>
      )}

      {/* Overlay controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
        {/* Pin Button */}
        <button
          onClick={onPin}
          className="p-2 bg-black/60 hover:bg-black/80 rounded-lg border border-white/10 backdrop-blur-md cursor-pointer shadow-md text-white"
          title="Pin to Stage"
        >
          <Pin className="w-4 h-4" />
        </button>

        {/* PiP Button */}
        {user.videoTrack && (
          <button
            onClick={togglePiP}
            className="p-2 bg-black/60 hover:bg-black/80 rounded-lg border border-white/10 backdrop-blur-md cursor-pointer shadow-md text-white"
            title="Picture in Picture"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      <span className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md text-xs font-semibold backdrop-blur-md border border-white/10 tracking-wide z-10">
        {displayName}
      </span>
    </div>
  )
}
