import { useState } from 'react';
import { Users, Calendar, AlertTriangle, Activity, UserCheck, Search, Ban, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { usePickleballStore } from '../store/usePickleballStore';

export function AdminDashboard() {
  const { users, matches, updateUser, impersonate } = usePickleballStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMatches = matches.length;
  const confirmedMatches = matches.filter(m => m.status === 'confirmed').length;
  const canceledMatches = matches.filter(m => m.status === 'canceled').length;
  const cancelRate = totalMatches > 0 ? ((canceledMatches / totalMatches) * 100).toFixed(1) : '0';

  const smsFailures = users.filter(u => u.smsConsent && !u.smsEnabled).length;
  const emailFailures = users.filter(u => !u.emailEnabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h1>Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage players, matches, and system settings</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl">{users.length}</div>
          </div>
          <div className="text-slate-600">Total Players</div>
          <div className="text-sm text-slate-500 mt-1">
            {users.filter(u => u.status === 'active').length} active
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-2xl">{confirmedMatches}</div>
          </div>
          <div className="text-slate-600">Confirmed Matches</div>
          <div className="text-sm text-slate-500 mt-1">
            {matches.filter(m => m.status === 'pending').length} pending
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl">{cancelRate}%</div>
          </div>
          <div className="text-slate-600">Cancel Rate</div>
          <div className="text-sm text-slate-500 mt-1">
            {canceledMatches} of {totalMatches} matches
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl">{smsFailures + emailFailures}</div>
          </div>
          <div className="text-slate-600">Notification Issues</div>
          <div className="text-sm text-slate-500 mt-1">
            {smsFailures} SMS, {emailFailures} email
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="players" className="space-y-4">
        <TabsList>
          <TabsTrigger value="players">Player Management</TabsTrigger>
          <TabsTrigger value="matches">All Matches</TabsTrigger>
          <TabsTrigger value="notifications">Notification Logs</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Players Tab */}
        <TabsContent value="players" className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search players..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="vacation">On Vacation</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-700 text-sm">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        {user.isAdmin && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </div>
                    <div className="hidden md:block">
                      <Badge
                        className={
                          user.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : user.status === 'vacation'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }
                      >
                        {user.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => impersonate(user.id)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Impersonate</span>
                    </Button>
                    <Select
                      value={user.status}
                      onValueChange={(value) => updateUser(user.id, { status: value as any })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="vacation">Vacation</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Matches Tab */}
        <TabsContent value="matches" className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="space-y-3">
              {matches.map(match => {
                const challenger = users.find(u => u.id === match.challengerId);
                const opponent = users.find(u => u.id === match.opponentId);

                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div>
                        {challenger?.name} vs {opponent?.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {new Date(match.date).toLocaleDateString()} at {match.startTime} ({match.duration} min)
                      </div>
                    </div>
                    <Badge
                      className={
                        match.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : match.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : match.status === 'canceled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-700'
                      }
                    >
                      {match.status}
                    </Badge>
                  </div>
                );
              })}

              {matches.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No matches found</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Notification Logs Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="mb-4">Notification Failure Logs</h2>
            <div className="space-y-3">
              {users
                .filter(u => !u.smsEnabled || !u.emailEnabled)
                .map(user => (
                  <div
                    key={user.id}
                    className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <div>{user.name}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        {!user.smsEnabled && 'SMS delivery failed - invalid phone number'}
                        {!user.emailEnabled && 'Email delivery failed - invalid email address'}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        Last attempt: {new Date().toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}

              {users.filter(u => !u.smsEnabled || !u.emailEnabled).length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No notification failures</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <Activity className="w-5 h-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>Match created</span>
                    <span className="text-sm text-slate-500">2 hours ago</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Alice Johnson challenged Bob Smith
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <Activity className="w-5 h-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>Player status changed</span>
                    <span className="text-sm text-slate-500">5 hours ago</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Carol Davis set status to vacation
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <Activity className="w-5 h-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>Match confirmed</span>
                    <span className="text-sm text-slate-500">1 day ago</span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Bob Smith accepted challenge from Current User
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
