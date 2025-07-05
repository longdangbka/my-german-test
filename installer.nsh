# Custom NSIS installer script for Windows
# This file customizes the Windows installer

!macro customHeader
  !system "echo 'Building Windows installer for My German Test'"
!macroend

!macro customInit
  # Add any custom initialization here
!macroend

!macro customInstall
  # Custom installation steps
  WriteRegStr HKLM "Software\MyGermanTest" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\MyGermanTest" "Version" "${VERSION}"
!macroend

!macro customUnInstall
  # Custom uninstallation steps
  DeleteRegKey HKLM "Software\MyGermanTest"
!macroend
