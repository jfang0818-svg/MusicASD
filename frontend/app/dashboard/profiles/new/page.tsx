'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createChildProfile, uploadProfileDocument } from '../../../lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Upload, X, FileText } from 'lucide-react';
import Link from 'next/link';

export default function NewProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    // Demographics
    name: '',
    age: '',
    gender: '',
    race: '',
    diagnosis_date: '',
    asd_level: '',
    comorbidities: '',

    // Sensory
    sound_sensitivity: 'medium',
    loud_noises_trigger: false,
    sudden_sounds_trigger: false,
    specific_triggers: '',
    calming_sounds: '',

    // Communication
    verbal_communication: 'limited',
    speech_clarity: '',
    uses_aac: false,
    preferred_communication: '',

    // Behavioral
    repetitive_behaviors: '',
    meltdown_triggers: '',
    calming_activities: '',
    attention_span: '',

    // Music Preferences
    preferred_genres: '',
    preferred_instruments: '',
    preferred_tempo: 'medium',
    disliked_music: '',
    successful_therapy_music: '',

    // Therapy Goals
    therapy_goals: '',
    focus_areas: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build the profile object
      const profile = {
        demographics: {
          name: formData.name,
          age: parseInt(formData.age),
          gender: formData.gender || undefined,
          race: formData.race || undefined,
          diagnosis_date: formData.diagnosis_date || undefined,
          asd_level: formData.asd_level || undefined,
          comorbidities: formData.comorbidities ? formData.comorbidities.split(',').map(c => c.trim()) : undefined,
        },
        sensory_sensitivities: {
          sound_sensitivity: formData.sound_sensitivity,
          loud_noises_trigger: formData.loud_noises_trigger,
          sudden_sounds_trigger: formData.sudden_sounds_trigger,
          specific_triggers: formData.specific_triggers || undefined,
          calming_sounds: formData.calming_sounds || undefined,
        },
        communication: {
          verbal_communication: formData.verbal_communication,
          speech_clarity: formData.speech_clarity || undefined,
          uses_aac: formData.uses_aac,
          preferred_communication: formData.preferred_communication || undefined,
        },
        behavioral_patterns: {
          repetitive_behaviors: formData.repetitive_behaviors || undefined,
          meltdown_triggers: formData.meltdown_triggers || undefined,
          calming_activities: formData.calming_activities || undefined,
          attention_span: formData.attention_span || undefined,
        },
        music_preferences: {
          preferred_genres: formData.preferred_genres ? formData.preferred_genres.split(',').map(g => g.trim()) : undefined,
          preferred_instruments: formData.preferred_instruments ? formData.preferred_instruments.split(',').map(i => i.trim()) : undefined,
          preferred_tempo: formData.preferred_tempo || undefined,
          disliked_music: formData.disliked_music ? formData.disliked_music.split(',').map(m => m.trim()) : undefined,
          successful_therapy_music: formData.successful_therapy_music || undefined,
        },
        therapy_goals: {
          goals: formData.therapy_goals ? formData.therapy_goals.split(',').map(g => g.trim()) : undefined,
          focus_areas: formData.focus_areas ? formData.focus_areas.split(',').map(f => f.trim()) : undefined,
        },
      };

      const result = await createChildProfile(profile);

      // Upload documents if any
      if (uploadedFiles.length > 0) {
        toast.success(`Profile created! Uploading ${uploadedFiles.length} document(s)...`);

        let uploadSuccessCount = 0;
        for (const file of uploadedFiles) {
          try {
            await uploadProfileDocument(result.id, file);
            uploadSuccessCount++;
          } catch (uploadError) {
            console.error(`Error uploading ${file.name}:`, uploadError);
            toast.error(`Failed to upload ${file.name}`);
          }
        }

        if (uploadSuccessCount > 0) {
          toast.success(`Profile created with ${uploadSuccessCount} document(s)! 🎉`);
        }
      } else {
        toast.success(`Profile created for ${result.demographics.name}! 🎉`);
      }

      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast.error(error.response?.data?.detail || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-purple-600 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Create Child Profile
              </h1>
              <p className="text-gray-600">Help us understand your child better</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Demographics Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📋</span>
              <h2 className="text-xl font-bold text-gray-800">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Child's Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                  placeholder="Alex"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  min="0"
                  max="120"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                  placeholder="7"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender
                </label>
                <input
                  type="text"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                  placeholder="Male, Female, Non-binary, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ASD Support Level
                </label>
                <select
                  name="asd_level"
                  value={formData.asd_level}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                >
                  <option value="">Select level</option>
                  <option value="1">Level 1 (Requiring support)</option>
                  <option value="2">Level 2 (Requiring substantial support)</option>
                  <option value="3">Level 3 (Requiring very substantial support)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Diagnosis Date
                </label>
                <input
                  type="date"
                  name="diagnosis_date"
                  value={formData.diagnosis_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Other Diagnoses <span className="text-gray-400 text-xs">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="comorbidities"
                  value={formData.comorbidities}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                  placeholder="ADHD, Anxiety, etc."
                />
              </div>
            </div>
          </motion.div>

          {/* Sensory Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎧</span>
              <h2 className="text-xl font-bold text-gray-800">Sensory Sensitivities</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sound Sensitivity
                </label>
                <select
                  name="sound_sensitivity"
                  value={formData.sound_sensitivity}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="loud_noises_trigger"
                    checked={formData.loud_noises_trigger}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Loud noises are a trigger</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="sudden_sounds_trigger"
                    checked={formData.sudden_sounds_trigger}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Sudden sounds are a trigger</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Specific Sound Triggers
                </label>
                <textarea
                  name="specific_triggers"
                  value={formData.specific_triggers}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none resize-none"
                  placeholder="E.g., High-pitched sounds, sirens, vacuum cleaners"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Calming Sounds
                </label>
                <textarea
                  name="calming_sounds"
                  value={formData.calming_sounds}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none resize-none"
                  placeholder="E.g., White noise, ocean waves, soft music"
                />
              </div>
            </div>
          </motion.div>

          {/* Communication Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">💬</span>
              <h2 className="text-xl font-bold text-gray-800">Communication</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Verbal Communication Level
                </label>
                <select
                  name="verbal_communication"
                  value={formData.verbal_communication}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                >
                  <option value="non-verbal">Non-verbal</option>
                  <option value="limited">Limited</option>
                  <option value="fluent">Fluent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Speech Clarity / Details
                </label>
                <textarea
                  name="speech_clarity"
                  value={formData.speech_clarity}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none resize-none"
                  placeholder="E.g., Uses 2-3 word phrases, mostly gestures"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="uses_aac"
                  checked={formData.uses_aac}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Uses AAC (Augmentative Communication) device</span>
              </label>
            </div>
          </motion.div>

          {/* Music Preferences Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎵</span>
              <h2 className="text-xl font-bold text-gray-800">Music Preferences</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Tempo
                </label>
                <select
                  name="preferred_tempo"
                  value={formData.preferred_tempo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                >
                  <option value="slow">Slow</option>
                  <option value="medium">Medium</option>
                  <option value="fast">Fast</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Genres <span className="text-gray-400 text-xs">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="preferred_genres"
                  value={formData.preferred_genres}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                  placeholder="Classical, Ambient, Nature sounds"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Instruments <span className="text-gray-400 text-xs">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="preferred_instruments"
                  value={formData.preferred_instruments}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                  placeholder="Piano, Violin, Flute"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Music to Avoid <span className="text-gray-400 text-xs">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="disliked_music"
                  value={formData.disliked_music}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                  placeholder="Heavy metal, Loud drums"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Music That Has Worked Well
                </label>
                <textarea
                  name="successful_therapy_music"
                  value={formData.successful_therapy_music}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none resize-none"
                  placeholder="E.g., Mozart piano sonatas, ocean wave recordings"
                />
              </div>
            </div>
          </motion.div>

          {/* Therapy Goals Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎯</span>
              <h2 className="text-xl font-bold text-gray-800">Therapy Goals</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Goals <span className="text-gray-400 text-xs">(comma-separated)</span>
                </label>
                <textarea
                  name="therapy_goals"
                  value={formData.therapy_goals}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none resize-none"
                  placeholder="Improve emotional regulation, Increase attention span, Reduce anxiety"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Focus Areas <span className="text-gray-400 text-xs">(comma-separated)</span>
                </label>
                <textarea
                  name="focus_areas"
                  value={formData.focus_areas}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none resize-none"
                  placeholder="Sensory processing, Social skills, Communication"
                />
              </div>
            </div>
          </motion.div>

          {/* Documents Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📎</span>
              <h2 className="text-xl font-bold text-gray-800">Documents</h2>
              <span className="text-sm text-gray-500">(Optional)</span>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Upload any relevant documents about the participant (e.g., therapy reports, assessments, medical records)
              </p>

              {/* File Input */}
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all"
                >
                  <Upload className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">
                    Choose Files or Drag & Drop
                  </span>
                </label>
              </div>

              {/* File List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Selected Files ({uploadedFiles.length})
                  </p>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-4"
          >
            <Link
              href="/dashboard"
              className="flex-1 px-6 py-4 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-center"
            >
              Cancel
            </Link>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Profile...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Profile
                </>
              )}
            </motion.button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
