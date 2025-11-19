import { useState } from 'react';
import { Bell, Mail, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function NotificationSettings() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpdatePreferences = async (updates: Record<string, any>) => {
    if (!token) return;

    setLoading(true);
    try {
      await axios.put(
        `${API_BASE_URL}/api/notifications/preferences`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh page to get updated user data
      window.location.reload();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  // Note: These fields may not exist on user object yet, so we provide defaults
  const smsEnabled = (user as any).sms_enabled ?? true;
  const emailEnabled = (user as any).email_enabled ?? true;
  const smsConsent = (user as any).sms_consent ?? false;
  const quietHoursStart = (user as any).quiet_hours_start || '22:00';
  const quietHoursEnd = (user as any).quiet_hours_end || '08:00';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-slate-500 mt-1">Manage how and when you receive notifications</p>
      </div>

      {/* Status Alerts */}
      {!smsEnabled && smsConsent && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            SMS notifications are disabled due to repeated delivery failures. Please verify your
            phone number.
          </AlertDescription>
        </Alert>
      )}

      {!emailEnabled && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your email address is invalid. Update your profile to receive email notifications.
          </AlertDescription>
        </Alert>
      )}

      {/* Notification Channels */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Notification Channels</h2>
          <p className="text-slate-500 mt-1">Choose how you want to be notified</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <Label htmlFor="email-toggle">Email Notifications</Label>
                <p className="text-sm text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>
            <Switch
              id="email-toggle"
              checked={emailEnabled}
              onCheckedChange={(checked) => handleUpdatePreferences({ email_enabled: checked })}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <Label htmlFor="sms-toggle">SMS Notifications</Label>
                <p className="text-sm text-slate-500">
                  {smsConsent ? user.phone || 'Phone number not set' : 'Not consented'}
                </p>
              </div>
            </div>
            <Switch
              id="sms-toggle"
              checked={smsEnabled && smsConsent}
              onCheckedChange={(checked) => handleUpdatePreferences({ sms_enabled: checked })}
              disabled={!smsConsent || loading}
            />
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h2 className="text-xl font-semibold">Quiet Hours</h2>
          </div>
          <p className="text-slate-500 mt-1">
            Notifications will be delayed until after quiet hours
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quiet-start">Start Time</Label>
            <input
              id="quiet-start"
              type="time"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
              defaultValue={quietHoursStart}
              onBlur={(e) => handleUpdatePreferences({ quiet_hours_start: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quiet-end">End Time</Label>
            <input
              id="quiet-end"
              type="time"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
              defaultValue={quietHoursEnd}
              onBlur={(e) => handleUpdatePreferences({ quiet_hours_end: e.target.value })}
              disabled={loading}
            />
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <strong>Example:</strong> If quiet hours are 10:00 PM - 8:00 AM, notifications received
          during this time will be sent at 8:00 AM instead.
        </div>
      </div>

      {/* Notification Types */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-600" />
            <h2 className="text-xl font-semibold">Notification Types</h2>
          </div>
          <p className="text-slate-500 mt-1">Choose what events trigger notifications</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-b-0">
            <div>
              <div className="font-medium">Match Challenges</div>
              <div className="text-sm text-slate-500">
                When someone challenges you to a match
              </div>
            </div>
            <Switch defaultChecked disabled={loading} />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-b-0">
            <div>
              <div className="font-medium">Challenge Responses</div>
              <div className="text-sm text-slate-500">
                When someone accepts or declines your challenge
              </div>
            </div>
            <Switch defaultChecked disabled={loading} />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-b-0">
            <div>
              <div className="font-medium">Match Reminders</div>
              <div className="text-sm text-slate-500">
                Reminders for upcoming confirmed matches
              </div>
            </div>
            <Switch defaultChecked disabled={loading} />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-b-0">
            <div>
              <div className="font-medium">Match Cancellations</div>
              <div className="text-sm text-slate-500">
                When an opponent cancels a confirmed match
              </div>
            </div>
            <Switch defaultChecked disabled={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
