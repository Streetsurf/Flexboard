import React, { useState, useEffect, useRef } from 'react';
import { Play, Plus, X, Upload, Image, Settings, Edit2, Trash2, ArrowLeft, BookOpen, Video, Headphones, FileText, Link, Calendar, Clock, Star, Tag, Eye, MoreVertical, ChevronDown, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import AddContentForm from './AddContentForm';

interface Channel {
  id: string;
  name: string;
  logo_url?: string;
  created_at: string;
  user_id: string;
}

interface ContentItem {
  id: string;
  title: string;
  type: 'video' | 'article' | 'book' | 'podcast' | 'course' | 'tutorial' | 'documentary' | 'webinar';
  status: 'planned' | 'watching' | 'completed' | 'published';
  progress: number;
  user_id: string;
  channel_id?: string;
  created_at: string;
  url?: string;
  duration?: number;
  rating?: number;
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  deadline?: string;
}

interface ContentFormData {
  title: string;
  contentType: 'Video' | 'Artikel' | 'Thread';
  totalScene: number;
  description: string;
  scenes: Array<{
    title: string;
    type: 'Visual' | 'Dialog' | 'Narasi' | 'Transisi';
    voiceOver?: string;
  }>;
  useVoiceOver: boolean;
}

const ChannelManager: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelContent, setChannelContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showContentForm, setShowContentForm] = useState(false);
  const [showEditContentForm, setShowEditContentForm] = useState(false);
  const [showContentDetail, setShowContentDetail] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'watching' | 'completed' | 'published'>('all');
  const [formData, setFormData] = useState({
    name: '',
    logo_url: ''
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchChannels();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChannel) {
      fetchChannelContent();
    }
  }, [selectedChannel]);

  // Filter content based on status
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredContent(channelContent);
    } else {
      setFilteredContent(channelContent.filter(item => item.status === statusFilter));
    }
  }, [channelContent, statusFilter]);

  const fetchChannels = async () => {
    try {
      setError(null);
      console.log('Fetching channels for user:', user?.id);
      
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching channels:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('Channels fetched successfully:', data?.length || 0, 'items');
      setChannels(data || []);
    } catch (error: any) {
      console.error('Error fetching channels:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load channels';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to database. Please check your internet connection.';
      } else if (error.message?.includes('Database error')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelContent = async () => {
    if (!selectedChannel) return;
    
    setContentLoading(true);
    try {
      setError(null);
      console.log('Fetching content for channel:', selectedChannel.id);
      
      // First, try to get content with channel_id
      let { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('user_id', user?.id)
        .eq('channel_id', selectedChannel.id)
        .order('created_at', { ascending: true }); // Order by created_at ASC for numbering

      // If no content found or channel_id doesn't exist, get all user content
      if (!data || data.length === 0) {
        const { data: allContent, error: allError } = await supabase
          .from('content_items')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: true }); // Order by created_at ASC for numbering
        
        if (allError) {
          console.error('Supabase error fetching all content:', allError);
          throw new Error(`Database error: ${allError.message}`);
        }
        data = allContent || [];
      }

      if (error) {
        console.error('Supabase error fetching channel content:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('Channel content fetched successfully:', data?.length || 0, 'items');
      setChannelContent(data || []);
    } catch (error: any) {
      console.error('Error fetching channel content:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load channel content';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to database. Please check your internet connection.';
      } else if (error.message?.includes('Database error')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setChannelContent([]);
    } finally {
      setContentLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        // Create canvas to resize image to 200x200
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 200;
        canvas.height = 200;
        
        if (ctx) {
          // Draw image scaled to fit 200x200 while maintaining aspect ratio
          const scale = Math.min(200 / img.width, 200 / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const x = (200 - scaledWidth) / 2;
          const y = (200 - scaledHeight) / 2;
          
          // Fill background with white
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 200, 200);
          
          // Draw the image
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          
          // Convert to base64
          const resizedDataUrl = canvas.toDataURL('image/png', 0.9);
          setFormData({ ...formData, logo_url: resizedDataUrl });
        }
        setUploading(false);
      };
      
      img.onerror = () => {
        alert('Invalid image file');
        setUploading(false);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      alert('Failed to read file');
      setUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      if (selectedChannel && showAddModal) {
        // Update existing channel
        const { data, error } = await supabase
          .from('channels')
          .update({
            name: formData.name.trim(),
            logo_url: formData.logo_url || null
          })
          .eq('id', selectedChannel.id)
          .select()
          .single();

        if (error) throw error;
        
        setChannels(channels.map(channel => 
          channel.id === selectedChannel.id ? data : channel
        ));
        setSelectedChannel(data);
      } else {
        // Add new channel
        const { data, error } = await supabase
          .from('channels')
          .insert([
            {
              name: formData.name.trim(),
              logo_url: formData.logo_url || null,
              user_id: user?.id
            }
          ])
          .select()
          .single();

        if (error) throw error;
        
        setChannels([data, ...channels]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving channel:', error);
      alert('Failed to save channel. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleContentFormSubmit = async (contentData: ContentFormData) => {
    if (!selectedChannel || !user?.id) {
      console.error('Missing required data:', { selectedChannel, userId: user?.id });
      alert('Missing required data. Please try again.');
      return;
    }

    setSaving(true);
    try {
      console.log('Submitting content data:', contentData);

      // Map content type to database enum values
      const typeMapping: { [key: string]: ContentItem['type'] } = {
        'Video': 'video',
        'Artikel': 'article', 
        'Thread': 'article' // Thread mapped to article for now
      };

      const mappedType = typeMapping[contentData.contentType] || 'article';

      // Prepare content item data
      const contentItem = {
        title: contentData.title.trim(),
        type: mappedType,
        status: 'planned' as ContentItem['status'],
        progress: 0,
        user_id: user.id,
        channel_id: selectedChannel.id,
        // Store additional data in notes field as JSON string
        notes: JSON.stringify({
          description: contentData.description,
          totalScene: contentData.totalScene,
          scenes: contentData.scenes,
          useVoiceOver: contentData.useVoiceOver,
          contentType: contentData.contentType // Keep original type for reference
        })
      };

      console.log('Inserting content item:', contentItem);

      const { data, error } = await supabase
        .from('content_items')
        .insert([contentItem])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Content saved successfully:', data);
      
      // Update local state
      setChannelContent([...channelContent, data]); // Add to end to maintain order
      setShowContentForm(false);
      
      alert('Content added successfully!');
    } catch (error) {
      console.error('Error adding content:', error);
      
      // More specific error messages
      if (error.message?.includes('violates check constraint')) {
        alert('Invalid content type. Please check your selection and try again.');
      } else if (error.message?.includes('violates foreign key constraint')) {
        alert('Channel not found. Please refresh and try again.');
      } else {
        alert(`Failed to add content: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditContentFormSubmit = async (contentData: ContentFormData) => {
    if (!selectedContent || !user?.id) {
      alert('Missing required data. Please try again.');
      return;
    }

    setSaving(true);
    try {
      // Map content type to database enum values
      const typeMapping: { [key: string]: ContentItem['type'] } = {
        'Video': 'video',
        'Artikel': 'article', 
        'Thread': 'article'
      };

      const mappedType = typeMapping[contentData.contentType] || 'article';

      // Update content item
      const { data, error } = await supabase
        .from('content_items')
        .update({
          title: contentData.title.trim(),
          type: mappedType,
          notes: JSON.stringify({
            description: contentData.description,
            totalScene: contentData.totalScene,
            scenes: contentData.scenes,
            useVoiceOver: contentData.useVoiceOver,
            contentType: contentData.contentType
          })
        })
        .eq('id', selectedContent.id)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setChannelContent(channelContent.map(item => 
        item.id === selectedContent.id ? data : item
      ));
      setShowEditContentForm(false);
      setSelectedContent(null);
      
      alert('Content updated successfully!');
    } catch (error) {
      console.error('Error updating content:', error);
      alert('Failed to update content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateContentStatus = async (id: string, status: ContentItem['status']) => {
    try {
      const { error } = await supabase
        .from('content_items')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      setChannelContent(channelContent.map(item => 
        item.id === id ? { ...item, status } : item
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setChannelContent(channelContent.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content. Please try again.');
    }
  };

  const deleteChannel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this channel? This will not delete the content items.')) return;

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setChannels(channels.filter(channel => channel.id !== id));
      setSelectedChannel(null);
    } catch (error) {
      console.error('Error deleting channel:', error);
      alert('Failed to delete channel. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', logo_url: '' });
    setShowAddModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openEditModal = (channel: Channel) => {
    setFormData({
      name: channel.name,
      logo_url: channel.logo_url || ''
    });
    setShowAddModal(true);
  };

  const openAddContentForm = () => {
    setShowContentForm(true);
  };

  const closeContentForm = () => {
    setShowContentForm(false);
  };

  const openEditContentForm = (content: ContentItem) => {
    setSelectedContent(content);
    setShowEditContentForm(true);
  };

  const closeEditContentForm = () => {
    setShowEditContentForm(false);
    setSelectedContent(null);
  };

  const openContentDetail = (content: ContentItem) => {
    setSelectedContent(content);
    setShowContentDetail(true);
  };

  const closeContentDetail = () => {
    setShowContentDetail(false);
    setSelectedContent(null);
  };

  const isValidImageUrl = (url: string): boolean => {
    return url && (url.startsWith('http') || url.startsWith('data:image/'));
  };

  const getStatusBadge = (status: ContentItem['status']) => {
    switch (status) {
      case 'planned': return 'badge badge-gray';
      case 'watching': return 'badge badge-info';
      case 'completed': return 'badge bg-orange-100 text-orange-700 border border-orange-200';
      case 'published': return 'badge badge-success';
      default: return 'badge badge-gray';
    }
  };

  const getStatusLabel = (status: ContentItem['status']) => {
    switch (status) {
      case 'planned': return 'Planned';
      case 'watching': return 'On Progress';
      case 'completed': return 'Ready to Post';
      case 'published': return 'Published';
      default: return 'Planned';
    }
  };

  const getTypeIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'article': return <FileText className="w-4 h-4" />;
      case 'book': return <BookOpen className="w-4 h-4" />;
      case 'podcast': return <Headphones className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const parseContentNotes = (notes: string | null) => {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  };

  const getChannelStats = () => {
    const total = channelContent.length;
    const planned = channelContent.filter(item => item.status === 'planned').length;
    const watching = channelContent.filter(item => item.status === 'watching').length;
    const completed = channelContent.filter(item => item.status === 'completed').length;
    const published = channelContent.filter(item => item.status === 'published').length;
    
    return { total, planned, watching, completed, published };
  };

  const getFilteredStats = () => {
    const total = filteredContent.length;
    const planned = filteredContent.filter(item => item.status === 'planned').length;
    const watching = filteredContent.filter(item => item.status === 'watching').length;
    const completed = filteredContent.filter(item => item.status === 'completed').length;
    const published = filteredContent.filter(item => item.status === 'published').length;
    
    return { total, planned, watching, completed, published };
  };

  // Function to add sample content for testing
  const addSampleContent = async () => {
    if (!selectedChannel || !user?.id) return;

    const sampleContents = [
      {
        title: "Tutorial React Hooks",
        type: "video",
        description: "Panduan lengkap menggunakan React Hooks untuk pemula",
        totalScene: 5,
        useVoiceOver: true
      },
      {
        title: "Tips JavaScript ES6",
        type: "article", 
        description: "Fitur-fitur terbaru JavaScript ES6 yang wajib dikuasai",
        totalScene: 3,
        useVoiceOver: false
      },
      {
        title: "Setup Development Environment",
        type: "video",
        description: "Cara setup environment development yang optimal",
        totalScene: 4,
        useVoiceOver: true
      },
      {
        title: "Best Practices CSS",
        type: "article",
        description: "Praktik terbaik dalam menulis CSS yang maintainable",
        totalScene: 6,
        useVoiceOver: false
      }
    ];

    try {
      for (const content of sampleContents) {
        const contentItem = {
          title: content.title,
          type: content.type as ContentItem['type'],
          status: 'planned' as ContentItem['status'],
          progress: 0,
          user_id: user.id,
          channel_id: selectedChannel.id,
          notes: JSON.stringify({
            description: content.description,
            totalScene: content.totalScene,
            scenes: Array.from({ length: content.totalScene }, (_, i) => ({
              title: `Scene ${i + 1}`,
              type: 'Visual',
              voiceOver: content.useVoiceOver ? `Voice over for scene ${i + 1}` : undefined
            })),
            useVoiceOver: content.useVoiceOver,
            contentType: content.type === 'video' ? 'Video' : 'Artikel'
          })
        };

        await supabase.from('content_items').insert([contentItem]);
      }
      
      // Refresh content list
      fetchChannelContent();
      alert('Sample content added successfully!');
    } catch (error) {
      console.error('Error adding sample content:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error && !selectedChannel) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16 animate-fadeIn">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={fetchChannels}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show Content Form
  if (showContentForm && selectedChannel) {
    return (
      <div className="space-y-6">
        <AddContentForm
          onSubmit={handleContentFormSubmit}
          onCancel={closeContentForm}
          loading={saving}
        />
      </div>
    );
  }

  // Show Edit Content Form
  if (showEditContentForm && selectedContent) {
    const contentData = parseContentNotes(selectedContent.notes);
    const initialData = {
      title: selectedContent.title,
      contentType: (contentData?.contentType || 'Video') as 'Video' | 'Artikel' | 'Thread',
      totalScene: contentData?.totalScene || 1,
      description: contentData?.description || '',
      scenes: contentData?.scenes || [{ title: '', type: 'Visual' as const }],
      useVoiceOver: contentData?.useVoiceOver || false
    };

    return (
      <div className="space-y-6">
        <AddContentForm
          onSubmit={handleEditContentFormSubmit}
          onCancel={closeEditContentForm}
          loading={saving}
          initialData={initialData}
          isEditing={true}
        />
      </div>
    );
  }

  // Show Content Detail Modal
  if (showContentDetail && selectedContent) {
    const contentData = parseContentNotes(selectedContent.notes);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Content Details</h3>
              <button
                onClick={closeContentDetail}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200 hover-scale"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{selectedContent.title}</h4>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <span className={getStatusBadge(selectedContent.status)}>
                    {getStatusLabel(selectedContent.status)}
                  </span>
                  <span>Type: {selectedContent.type}</span>
                  <span>Created: {new Date(selectedContent.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Description */}
              {contentData?.description && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Description</h5>
                  <p className="text-gray-600 text-sm leading-relaxed">{contentData.description}</p>
                </div>
              )}

              {/* Scene Information */}
              {contentData?.totalScene && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Scene Information</h5>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Total Scenes: {contentData.totalScene}</span>
                      {contentData.useVoiceOver && (
                        <span className="text-sm text-green-600 flex items-center">
                          ✅ Voice Over Enabled
                        </span>
                      )}
                    </div>
                    
                    {contentData.scenes && contentData.scenes.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <h6 className="text-xs font-medium text-gray-700">Scenes:</h6>
                        {contentData.scenes.map((scene: any, index: number) => (
                          <div key={index} className="bg-white rounded p-2 border border-gray-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-900">Scene {index + 1}: {scene.title}</span>
                              <span className="text-xs text-gray-500">{scene.type}</span>
                            </div>
                            {scene.voiceOver && (
                              <p className="text-xs text-gray-600 mt-1">{scene.voiceOver}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  closeContentDetail();
                  openEditContentForm(selectedContent);
                }}
                className="btn-primary"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Content
              </button>
              <button
                onClick={closeContentDetail}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a channel is selected, show channel management
  if (selectedChannel && !showAddModal) {
    const stats = getChannelStats();
    const filteredStats = getFilteredStats();
    
    return (
      <div className="space-y-6">
        {/* Channel Management Header */}
        <div className="card animate-fadeIn">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedChannel(null)}
                className="btn-icon-secondary"
                title="Back to channels"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {selectedChannel.logo_url && isValidImageUrl(selectedChannel.logo_url) ? (
                  <img
                    src={selectedChannel.logo_url}
                    alt={selectedChannel.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Play className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <h2 className="card-title">{selectedChannel.name} Management</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => openEditModal(selectedChannel)}
                className="btn-secondary"
              >
                <Edit2 className="w-3 h-3 mr-1.5" />
                Edit Channel
              </button>
              <button
                onClick={() => deleteChannel(selectedChannel.id)}
                className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3 mr-1.5" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Show error state for content if there's an error */}
        {error && (
          <div className="card animate-fadeIn">
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Play className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchChannelContent}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* 🎯 MAIN CONTENT SECTION - VERTICAL LIST LIKE TASKS */}
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">Channel Content</h3>
            <div className="flex items-center space-x-2">
              {/* Add Sample Content Button for Testing */}
              {channelContent.length === 0 && !error && (
                <button 
                  onClick={addSampleContent}
                  className="btn-secondary text-xs"
                >
                  Add Sample
                </button>
              )}
              <button 
                onClick={openAddContentForm}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </button>
            </div>
          </div>
          
          {/* 🔍 FILTER/SORT SECTION */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  <option value="all">All ({stats.total})</option>
                  <option value="planned">Planned ({stats.planned})</option>
                  <option value="watching">On Progress ({stats.watching})</option>
                  <option value="completed">Ready to Post ({stats.completed})</option>
                  <option value="published">Published ({stats.published})</option>
                </select>
              </div>
              
              <div className="text-xs text-gray-500">
                Showing {filteredStats.total} of {stats.total} content{stats.total !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          {/* 📋 VERTICAL LIST CONTENT - LIKE TASKS */}
          <div className="space-y-2.5">
            {contentLoading ? (
              /* Loading State */
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            ) : filteredContent.length === 0 && !error ? (
              /* Empty State */
              <div className="text-center py-8 text-gray-500 animate-fadeIn">
                <Play className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {statusFilter === 'all' ? (
                  <>
                    <p className="text-sm mb-2">No content added yet</p>
                    <div className="flex items-center justify-center space-x-3">
                      <button
                        onClick={addSampleContent}
                        className="btn-secondary text-xs"
                      >
                        Add Sample Content
                      </button>
                      <button
                        onClick={openAddContentForm}
                        className="text-blue-600 hover:text-blue-700 text-xs"
                      >
                        Add your first content
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm mb-2">No {statusFilter} content found</p>
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Show all content
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* 🚀 VERTICAL LIST - EXACTLY LIKE TASKS WITH NUMBERING */
              filteredContent.map((item, index) => {
                const contentData = parseContentNotes(item.notes);
                const sceneCount = contentData?.totalScene || 0;
                const hasVoiceOver = contentData?.useVoiceOver || false;
                
                // Calculate the actual number based on original order in channelContent
                const originalIndex = channelContent.findIndex(content => content.id === item.id);
                const contentNumber = originalIndex + 1;
                
                return (
                  <div
                    key={item.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover-lift stagger-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                        {/* 🔢 CONTENT NUMBER */}
                        <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                          {contentNumber}
                        </div>
                        
                        {/* Type Icon */}
                        <div className="text-gray-600 mt-0.5">
                          {getTypeIcon(item.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <h4 className="font-medium text-gray-900 truncate text-xs mb-1">
                            {item.title}
                          </h4>
                          
                          {/* Description */}
                          {contentData?.description && (
                            <p className="text-xs text-gray-500 mb-1.5 line-clamp-2">
                              {contentData.description}
                            </p>
                          )}
                          
                          {/* 🏷️ META INFO - HORIZONTAL LAYOUT */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Scene Count */}
                            {sceneCount > 0 && (
                              <span className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                {sceneCount} scene{sceneCount > 1 ? 's' : ''}
                              </span>
                            )}
                            
                            {/* Voice Over Badge */}
                            {hasVoiceOver && (
                              <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                ✅ Voice Over
                              </span>
                            )}
                            
                            {/* 📅 STATUS DROPDOWN - SEJAJAR DENGAN BADGES */}
                            <select
                              value={item.status}
                              onChange={(e) => updateContentStatus(item.id, e.target.value as ContentItem['status'])}
                              className="text-xs px-1.5 py-0.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                            >
                              <option value="planned">Planned</option>
                              <option value="watching">On Progress</option>
                              <option value="completed">Ready to Post</option>
                              <option value="published">Published</option>
                            </select>
                            
                            {/* Created Date */}
                            <span className="text-xs text-gray-500">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-0.5 flex-shrink-0">
                        <button
                          onClick={() => openContentDetail(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200 hover-scale"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openEditContentForm(item)}
                          className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all duration-200 hover-scale"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteContent(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 hover-scale"
                          title="Delete"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Channel Statistics */}
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">Channel Statistics</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="stat-card">
              <div className="stat-value text-blue-600">{stats.total}</div>
              <div className="stat-label">Total Content</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-gray-600">{stats.planned}</div>
              <div className="stat-label">Planned</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-blue-600">{stats.watching}</div>
              <div className="stat-label">On Progress</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-orange-600">{stats.completed}</div>
              <div className="stat-label">Ready to Post</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-green-600">{stats.published}</div>
              <div className="stat-label">Published</div>
            </div>
          </div>
        </div>

        {/* Channel Settings */}
        <div className="card animate-fadeIn">
          <div className="card-header">
            <h3 className="card-title">Channel Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Channel Information</h4>
              <div className="grid-2">
                <div>
                  <label className="text-sm text-gray-600">Channel Name</label>
                  <p className="font-medium text-gray-900">{selectedChannel.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Created</label>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedChannel.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Channels Grid */}
      {channels.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No channels yet</h3>
          <p className="text-gray-600 mb-6">Click the + button to add your first content channel</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel, index) => (
            <div
              key={channel.id}
              onClick={() => setSelectedChannel(channel)}
              className="card hover-lift stagger-item group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {channel.logo_url && isValidImageUrl(channel.logo_url) ? (
                      <img
                        src={channel.logo_url}
                        alt={channel.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Play className={`w-6 h-6 text-gray-400 ${channel.logo_url && isValidImageUrl(channel.logo_url) ? 'hidden' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-sm">
                      {channel.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {new Date(channel.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <Settings className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
              
              <div className="text-xs text-gray-500">
                Click to manage channel
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 hover-lift"
        title="Add Channel"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add/Edit Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedChannel ? 'Edit Channel' : 'Add New Channel'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-all duration-200 hover-scale"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Channel Logo (Optional)
                  </label>
                  
                  <div className="flex items-center justify-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-16 h-16 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {formData.logo_url && isValidImageUrl(formData.logo_url) ? (
                        <img
                          src={formData.logo_url}
                          alt="Logo preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
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
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{uploading ? 'Processing...' : 'Upload Logo'}</span>
                      </button>
                      
                      {formData.logo_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logo_url: '' })}
                          className="mt-2 w-full text-sm text-red-600 hover:text-red-700 transition-colors"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Upload a PNG or JPG image. It will be automatically resized to 200x200px.
                  </p>
                </div>

                {/* Channel Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Programming Courses, Design Tutorials, Business Books"
                    className="input"
                    required
                    disabled={saving}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving || uploading || !formData.name.trim()}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : selectedChannel ? 'Update Channel' : 'Add Channel'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelManager;