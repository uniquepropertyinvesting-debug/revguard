'use client'

import { useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { logAudit } from '@/lib/audit'

export default function UserSettings() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  const handleSaveProfile = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      })
      if (error) throw error
      logAudit('profile_update', 'user', undefined, { field: 'display_name' })
      setStatus({ type: 'success', msg: 'Profile updated.' })
    } catch (e: unknown) {
      setStatus({ type: 'error', msg: e instanceof Error ? e.message : 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordStatus(null)
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', msg: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', msg: 'Passwords do not match.' })
      return
    }
    setChangingPassword(true)
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      })
      if (signInError) {
        setPasswordStatus({ type: 'error', msg: 'Current password is incorrect.' })
        setChangingPassword(false)
        return
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      logAudit('password_change', 'user')
      setPasswordStatus({ type: 'success', msg: 'Password changed successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: unknown) {
      setPasswordStatus({ type: 'error', msg: e instanceof Error ? e.message : 'Failed to change password' })
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px' }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>Account Settings</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage your profile and security settings</div>
      </div>

      {/* Profile Section */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Profile</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Email cannot be changed. Contact support if needed.
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your Name"
              maxLength={100}
              style={{ width: '100%' }}
            />
          </div>

          {status && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: status.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: status.type === 'success' ? '#10b981' : '#ef4444',
            }}>
              {status.msg}
            </div>
          )}

          <div>
            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary" style={{ fontSize: '13px' }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Change Password</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              style={{ width: '100%' }}
            />
          </div>

          {passwordStatus && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: passwordStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${passwordStatus.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: passwordStatus.type === 'success' ? '#10b981' : '#ef4444',
            }}>
              {passwordStatus.msg}
            </div>
          )}

          <div>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="btn-primary"
              style={{ fontSize: '13px' }}
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Account Info</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>User ID</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{user?.id?.slice(0, 8)}...</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Auth Provider</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Email / Password</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Platform</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>RevGuard v1.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}
