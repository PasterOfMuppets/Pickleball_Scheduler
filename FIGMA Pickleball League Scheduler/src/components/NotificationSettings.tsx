import { Bell, Mail, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { usePickleballStore } from '../store/usePickleballStore';

export function NotificationSettings() {
  const { currentUser, impersonatedUser, updateUser } = usePickleballStore();
  const activeUser = impersonatedUser || currentUser;

  if (!activeUser) return null;

  const handleToggle = (field: string, value: boolean) => {
    updateUser(activeUser.id, { [field]: value });
  };

  const handleQuietHoursChange = (field: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    updateUser(activeUser.id, { [field]: value });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1>Notification Preferences</h1>
        <p className="text-slate-500 mt-1">Manage how and when you receive notifications</p>
      </div>

      {/* Status Alerts */}
      {!activeUser.smsEnabled && activeUser.smsConsent && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            SMS notifications are disabled due to repeated delivery failures. Please verify your
            phone number.
          </AlertDescription>
        </Alert>
      )}

      {!activeUser.emailEnabled && (
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
          <h2>Notification Channels</h2>
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
                  {activeUser.email}
                </p>
              </div>
            </div>
            <Switch
              id="email-toggle"
              checked={activeUser.emailEnabled}
              onCheckedChange={(checked) => handleToggle('emailEnabled', checked)}
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
                  {activeUser.smsConsent ? activeUser.phone : 'Not consented'}
                </p>
              </div>
            </div>
            <Switch
              id="sms-toggle"
              checked={activeUser.smsEnabled && activeUser.smsConsent}
              onCheckedChange={(checked) => handleToggle('smsEnabled', checked)}
              disabled={!activeUser.smsConsent}
            />
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h2>Quiet Hours</h2>
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
              value={activeUser.quietHoursStart || '22:00'}
              onChange={(e) => handleQuietHoursChange('quietHoursStart', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quiet-end">End Time</Label>
            <input
              id="quiet-end"
              type="time"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg"
              value={activeUser.quietHoursEnd || '08:00'}
              onChange={(e) => handleQuietHoursChange('quietHoursEnd', e.target.value)}
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
            <h2>Notification Types</h2>
          </div>
          <p className="text-slate-500 mt-1">Choose what events trigger notifications</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-b-0">
            <div>
              <div>Match Challenges</div>
              <div className="text-sm text-slate-500">
                When someone challenges you to a match
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-b-0">
            <div>
              <div>Challenge Responses</div>
              <div className="text-sm text-slate-500">
                When someone accepts or declines your challenge
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-b-0">
            <div>
              <div>Match Reminders</div>
              <div className="text-sm text-slate-500">
                Reminders for upcoming confirmed matches
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-b-0">
            <div>
              <div>Match Cancellations</div>
              <div className="text-sm text-slate-500">
                When an opponent cancels a confirmed match
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
        <strong>Privacy & Data:</strong> Figma Make is designed for prototyping and testing. Do not
        use this application to collect personally identifiable information (PII) or store sensitive
        data in production environments.
      </div>
    </div>
  );
}
