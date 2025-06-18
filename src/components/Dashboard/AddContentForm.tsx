import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Minus } from 'lucide-react';

interface SceneData {
  title: string;
  type: 'Visual' | 'Dialog' | 'Narasi' | 'Transisi';
  voiceOver?: string;
}

interface ContentFormData {
  title: string;
  contentType: 'Video' | 'Artikel' | 'Thread';
  totalScene: number;
  description: string;
  scenes: SceneData[];
  useVoiceOver: boolean;
}

interface AddContentFormProps {
  onSubmit: (data: ContentFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: ContentFormData;
  isEditing?: boolean;
}

const AddContentForm: React.FC<AddContentFormProps> = ({ 
  onSubmit, 
  onCancel, 
  loading = false,
  initialData,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<ContentFormData>(
    initialData || {
      title: '',
      contentType: 'Video',
      totalScene: 1,
      description: '',
      scenes: [{ title: '', type: 'Visual' }],
      useVoiceOver: false
    }
  );

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleTotalSceneChange = (value: number) => {
    const newTotal = Math.max(1, value);
    const currentScenes = [...formData.scenes];
    
    if (newTotal > currentScenes.length) {
      // Add new scenes
      for (let i = currentScenes.length; i < newTotal; i++) {
        currentScenes.push({ title: '', type: 'Visual' });
      }
    } else if (newTotal < currentScenes.length) {
      // Remove excess scenes
      currentScenes.splice(newTotal);
    }

    setFormData({
      ...formData,
      totalScene: newTotal,
      scenes: currentScenes
    });
  };

  const updateScene = (index: number, field: keyof SceneData, value: string) => {
    const updatedScenes = [...formData.scenes];
    updatedScenes[index] = {
      ...updatedScenes[index],
      [field]: value
    };
    setFormData({ ...formData, scenes: updatedScenes });
  };

  const handleVoiceOverChange = (checked: boolean) => {
    const updatedScenes = formData.scenes.map(scene => ({
      ...scene,
      voiceOver: checked ? (scene.voiceOver || '') : undefined
    }));
    
    setFormData({
      ...formData,
      useVoiceOver: checked,
      scenes: updatedScenes
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid = () => {
    return (
      formData.title.trim() &&
      formData.description.trim() &&
      formData.scenes.every(scene => scene.title.trim()) &&
      (!formData.useVoiceOver || formData.scenes.every(scene => scene.voiceOver?.trim()))
    );
  };

  return (
    <div className="card animate-fadeIn max-w-4xl mx-auto">
      <div className="card-header">
        <h2 className="card-title">{isEditing ? 'Edit Content' : 'Add New Content'}</h2>
        <button
          onClick={onCancel}
          className="btn-icon-secondary"
          disabled={loading}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Basic Information
          </h3>
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter content title..."
              className="input"
              required
              disabled={loading}
            />
          </div>

          {/* Content Type & Total Scene */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type *
              </label>
              <select
                value={formData.contentType}
                onChange={(e) => setFormData({ ...formData, contentType: e.target.value as ContentFormData['contentType'] })}
                className="input"
                disabled={loading}
              >
                <option value="Video">Video</option>
                <option value="Artikel">Artikel</option>
                <option value="Thread">Thread</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Scene *
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleTotalSceneChange(formData.totalScene - 1)}
                  className="btn-icon-secondary"
                  disabled={formData.totalScene <= 1 || loading}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.totalScene}
                  onChange={(e) => handleTotalSceneChange(parseInt(e.target.value) || 1)}
                  className="input text-center flex-1"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => handleTotalSceneChange(formData.totalScene + 1)}
                  className="btn-icon-secondary"
                  disabled={formData.totalScene >= 20 || loading}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi Content *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your content..."
              className="textarea"
              rows={4}
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Voice Over Option */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Voice Over Settings
          </h3>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="useVoiceOver"
              checked={formData.useVoiceOver}
              onChange={(e) => handleVoiceOverChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={loading}
            />
            <label htmlFor="useVoiceOver" className="text-sm font-medium text-gray-700">
              Menggunakan Voice Over?
            </label>
          </div>
        </div>

        {/* Dynamic Scene Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Scene Details ({formData.totalScene} scene{formData.totalScene > 1 ? 's' : ''})
          </h3>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {formData.scenes.map((scene, index) => (
              <div 
                key={index} 
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    Scene {index + 1}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {scene.type}
                  </span>
                </div>

                {/* Scene Title & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Scene Title *
                    </label>
                    <input
                      type="text"
                      value={scene.title}
                      onChange={(e) => updateScene(index, 'title', e.target.value)}
                      placeholder={`Scene ${index + 1} title...`}
                      className="input text-xs"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Scene Type *
                    </label>
                    <select
                      value={scene.type}
                      onChange={(e) => updateScene(index, 'type', e.target.value)}
                      className="input text-xs"
                      disabled={loading}
                    >
                      <option value="Visual">Visual</option>
                      <option value="Dialog">Dialog</option>
                      <option value="Narasi">Narasi</option>
                      <option value="Transisi">Transisi</option>
                    </select>
                  </div>
                </div>

                {/* Voice Over Field (if enabled) */}
                {formData.useVoiceOver && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Voice Over Scene {index + 1} *
                    </label>
                    <textarea
                      value={scene.voiceOver || ''}
                      onChange={(e) => updateScene(index, 'voiceOver', e.target.value)}
                      placeholder={`Voice over script for scene ${index + 1}...`}
                      className="textarea text-xs"
                      rows={3}
                      required={formData.useVoiceOver}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            {formData.scenes.length} scene{formData.scenes.length > 1 ? 's' : ''} configured
            {formData.useVoiceOver && ' with voice over'}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid() || loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : isEditing ? 'Update Content' : 'Save Content'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddContentForm;