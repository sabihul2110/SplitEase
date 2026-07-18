# SplitEase/backend/core/push_channels.py


"""
core/push_channels.py

Single source of truth for Android notification channel IDs sent in the
Expo push payload's channelId field. These must exactly match the channel
IDs created client-side in mobile/src/hooks/usePushNotifications.js —
if any rename happens, rename both.
"""

CHANNEL_DEFAULT     = "default"
CHANNEL_LEDGER      = "ledger"
CHANNEL_REMINDERS   = "reminders"
CHANNEL_BILLS       = "bills"
CHANNEL_ROUTINES    = "routines"
CHANNEL_SETTLEMENTS = "settlements"