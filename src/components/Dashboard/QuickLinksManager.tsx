import React, { useState, useEffect, useRef } from 'react';
import { Link, Plus, ExternalLink, Edit2, X, ChevronUp, ChevronDown, Save, AlertCircle, Upload, Image, Smartphone, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  user_id: string;
  order_index?: number;
  open_in_app?: boolean;
}

const QuickLinksManager: React.FC = () => {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    icon: '',
    open_in_app: false
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchLinks();
    }
  }, [user]);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_links')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching quick links:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeUrl = (url: string): string => {
    const trimmedUrl = url.trim();
    
    // If it already has a protocol, return as is
    if (trimmedUrl.match(/^https?:\/\//)) {
      return trimmedUrl;
    }
    
    // Add https:// if no protocol
    return `https://${trimmedUrl}`;
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      const normalizedUrl = normalizeUrl(formData.url);
      try {
        new URL(normalizedUrl);
      } catch {
        newErrors.url = 'Please enter a valid URL (e.g., example.com)';
      }
    }

    if (!editingLink && links.length >= 10) {
      newErrors.general = 'Maximum 10 links allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, icon: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, icon: 'Image must be smaller than 5MB' });
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        // Create canvas to resize image to 500x500
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 500;
        canvas.height = 500;
        
        if (ctx) {
          // Draw image scaled to fit 500x500 while maintaining aspect ratio
          const scale = Math.min(500 / img.width, 500 / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = (500 - scaledWidth) / 2;
          const y = (500 - scaledHeight) / 2;
          
          // Fill background with white
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 500, 500);
          
          // Draw the image
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          
          // Convert to base64
          const resizedDataUrl = canvas.toDataURL('image/png', 0.9);
          setFormData({ ...formData, icon: resizedDataUrl });
          setErrors({ ...errors, icon: '' });
        }
        setUploading(false);
      };
      
      img.onerror = () => {
        setErrors({ ...errors, icon: 'Invalid image file' });
        setUploading(false);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      setErrors({ ...errors, icon: 'Failed to read file' });
      setUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const normalizedUrl = normalizeUrl(formData.url);
      
      if (editingLink) {
        // Update existing link
        const { data, error } = await supabase
          .from('quick_links')
          .update({
            title: formData.title.trim(),
            url: normalizedUrl,
            icon: formData.icon || null,
            open_in_app: formData.open_in_app
          })
          .eq('id', editingLink.id)
          .select()
          .single();

        if (error) throw error;
        setLinks(links.map(link => link.id === editingLink.id ? data : link));
      } else {
        // Add new link
        const { data, error } = await supabase
          .from('quick_links')
          .insert([
            {
              title: formData.title.trim(),
              url: normalizedUrl,
              icon: formData.icon || null,
              open_in_app: formData.open_in_app,
              user_id: user?.id
            }
          ])
          .select()
          .single();

        if (error) throw error;
        setLinks([...links, data]);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving link:', error);
      setErrors({ general: 'Failed to save link. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (link: QuickLink) => {
    setEditingLink(link);
    // Remove https:// for editing to show clean URL
    const cleanUrl = link.url.replace(/^https?:\/\//, '');
    setFormData({
      title: link.title,
      url: cleanUrl,
      icon: link.icon || '',
      open_in_app: link.open_in_app || false
    });
    setShowAddForm(true);
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const { error } = await supabase
        .from('quick_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setLinks(links.filter(link => link.id !== id));
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const moveLink = async (index: number, direction: 'up' | 'down') => {
    const newLinks = [...links];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newLinks.length) return;

    // Swap positions
    [newLinks[index], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[index]];
    setLinks(newLinks);
  };

  const resetForm = () => {
    setFormData({ title: '', url: '', icon: '', open_in_app: false });
    setEditingLink(null);
    setShowAddForm(false);
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getDomainFromUrl = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  };

  const isValidImageUrl = (url: string): boolean => {
    return url && (url.startsWith('http') || url.startsWith('data:image/'));
  };

  const getAppUrl = (url: string, domain: string): string => {
    // Common app URL schemes
    const appSchemes: { [key: string]: string } = {
      'youtube.com': url.replace('https://www.youtube.com', 'youtube://').replace('https://youtube.com', 'youtube://'),
      'youtu.be': url.replace('https://youtu.be/', 'youtube://watch?v='),
      'instagram.com': url.replace('https://www.instagram.com', 'instagram://').replace('https://instagram.com', 'instagram://'),
      'twitter.com': url.replace('https://twitter.com', 'twitter://').replace('https://www.twitter.com', 'twitter://'),
      'x.com': url.replace('https://x.com', 'twitter://').replace('https://www.x.com', 'twitter://'),
      'facebook.com': url.replace('https://www.facebook.com', 'fb://').replace('https://facebook.com', 'fb://'),
      'tiktok.com': url.replace('https://www.tiktok.com', 'tiktok://').replace('https://tiktok.com', 'tiktok://'),
      'linkedin.com': url.replace('https://www.linkedin.com', 'linkedin://').replace('https://linkedin.com', 'linkedin://'),
      'spotify.com': url.replace('https://open.spotify.com', 'spotify:'),
      'discord.com': url.replace('https://discord.com', 'discord://').replace('https://www.discord.com', 'discord://'),
      'telegram.org': url.replace('https://t.me', 'tg://').replace('https://telegram.me', 'tg://'),
      'whatsapp.com': url.replace('https://wa.me', 'whatsapp://send?phone=').replace('https://web.whatsapp.com', 'whatsapp://'),
      'reddit.com': url.replace('https://www.reddit.com', 'reddit://').replace('https://reddit.com', 'reddit://'),
      'pinterest.com': url.replace('https://www.pinterest.com', 'pinterest://').replace('https://pinterest.com', 'pinterest://'),
      'twitch.tv': url.replace('https://www.twitch.tv', 'twitch://').replace('https://twitch.tv', 'twitch://'),
      'github.com': url.replace('https://github.com', 'github://'),
      'zoom.us': url.replace('https://zoom.us/j/', 'zoomus://zoom.us/join?confno='),
    };

    return appSchemes[domain] || url;
  };

  if (loading) {
    return (
      <div className="card animate-fadeIn">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Link className="w-4 h-4 text-white" />
            </div>
            <h2 className="card-title">Quick Links Manager</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={links.length >= 10}
            className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Add Link (${links.length}/10)`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-4">
              {editingLink ? 'Edit Link' : 'Add New Link'}
            </h3>
            
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo (PNG, 500x500px recommended)
                </label>
                
                <div className="flex items-center space-x-4">
                  {/* Current logo preview */}
                  <div className="w-16 h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                    {formData.icon && isValidImageUrl(formData.icon) ? (
                      <img
                        src={formData.icon}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  
                  {/* Upload button */}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Processing...' : 'Upload Logo'}
                    </button>
                    
                    {formData.icon && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: '' })}
                        className="ml-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                
                {errors.icon && (
                  <p className="text-red-600 text-xs mt-1">{errors.icon}</p>
                )}
                
                <p className="text-xs text-gray-500 mt-1">
                  Upload a PNG image. It will be automatically resized to 500x500px.
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter link title..."
                  className={`input ${errors.title ? 'border-red-300 focus:ring-red-500' : ''}`}
                />
                {errors.title && (
                  <p className="text-red-600 text-xs mt-1">{errors.title}</p>
                )}
              </div>

              {/* URL - FIXED: Better spacing and positioning */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                    https://
                  </span>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="example.com"
                    className={`input rounded-l-none border-l-0 ${errors.url ? 'border-red-300 focus:ring-red-500' : ''}`}
                  />
                </div>
                {errors.url && (
                  <p className="text-red-600 text-xs mt-1">{errors.url}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Just enter the domain (e.g., example.com). https:// will be added automatically.
                </p>
              </div>

              {/* Open in App Option */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.open_in_app}
                    onChange={(e) => setFormData({ ...formData, open_in_app: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Try to open in app (if available)
                    </span>
                  </div>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  When enabled, will attempt to open supported apps (YouTube, Instagram, Twitter, etc.) instead of browser.
                </p>
              </div>

              {/* Preview */}
              {formData.title && formData.url && (
                <div className="p-3 bg-white border border-gray-200 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md">
                    <div className="w-8 h-8 flex items-center justify-center text-gray-600 bg-white rounded overflow-hidden">
                      {formData.icon && isValidImageUrl(formData.icon) ? (
                        <img
                          src={formData.icon}
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ExternalLink className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{formData.title}</p>
                      <p className="text-xs text-gray-500">{getDomainFromUrl(normalizeUrl(formData.url))}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {formData.open_in_app ? (
                        <Smartphone className="w-4 h-4 text-blue-600" title="Opens in app" />
                      ) : (
                        <Globe className="w-4 h-4 text-gray-600" title="Opens in browser" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : editingLink ? 'Update Link' : 'Add Link'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Links List */}
        <div className="space-y-3">
          {links.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Link className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No quick links yet. Add some above!</p>
            </div>
          ) : (
            links.map((link, index) => {
              const hasCustomLogo = isValidImageUrl(link.icon || '');
              const domain = getDomainFromUrl(link.url);
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                      {hasCustomLogo ? (
                        <img
                          src={link.icon}
                          alt={link.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <ExternalLink className={`w-5 h-5 text-gray-600 ${hasCustomLogo ? 'hidden' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {link.title}
                        </h3>
                        {link.open_in_app ? (
                          <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0" title="Opens in app" />
                        ) : (
                          <Globe className="w-4 h-4 text-gray-600 flex-shrink-0" title="Opens in browser" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {domain}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Reorder buttons */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveLink(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveLink(index, 'down')}
                        disabled={index === links.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Visit link */}
                    <a
                      href={link.open_in_app ? getAppUrl(link.url, domain) : link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title={`Visit ${link.open_in_app ? 'in app' : 'in browser'}`}
                    >
                      {link.open_in_app ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                    </a>

                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(link)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit link"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete link"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickLinksManager;