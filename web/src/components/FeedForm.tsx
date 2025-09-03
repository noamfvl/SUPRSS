'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { Feed } from '@/lib/types';

type Props = {
  token: string;
  collectionId: number;
  onCreated: (f: Feed) => void;
};

export default function FeedForm({ token, collectionId, onCreated }: Props) {
  const [open, setOpen] = useState(false); // ouverture/fermeture du modal

  // Champs formulaire
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [updateFreq, setUpdateFreq] = useState<'hourly' | '6h' | 'daily'>('6h');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus automatique sur le premier champ
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => firstInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Fermeture avec la touche Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Reset du formulaire
  const reset = () => {
    setTitle('');
    setUrl('');
    setDescription('');
    setCategory('');
    setUpdateFreq('6h');
    setStatus('ACTIVE');
  };

  // Création d’un nouveau flux
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const f = await api.createFeed(token, {
      title: title.trim(),
      url: url.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      updateFreq,
      collectionId,
      status,
    });

    onCreated(f);   // callback parent
    setOpen(false); // ferme la modale
    reset();
  };

  // Ferme la modale en cliquant sur le backdrop
  const closeOnBackdrop = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) setOpen(false);
  };

  return (
    <>
      {/* Bouton principal */}
      <button className="btn btn-primary w-full" onClick={() => setOpen(true)}>
        + Ajouter un flux
      </button>

      {/* Fenêtre modale */}
      {open && (
        <div
          ref={dialogRef}
          onClick={closeOnBackdrop}
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          <div className="card w-full max-w-lg p-4" role="document">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Nouveau flux</h3>
              <button
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
                aria-label="Fermer la fenêtre"
                title="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Formulaire */}
            <form className="space-y-3" onSubmit={submit}>
              <div className="grid gap-3">
                <div>
                  <label className="text-xs text-gray-600">Titre</label>
                  <input
                    ref={firstInputRef}
                    className="input w-full"
                    placeholder='Ex: "Le Monde - Actualités"'
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">URL du flux RSS</label>
                  <input
                    className="input w-full"
                    placeholder="https://…/rss.xml"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    required
                    type="url"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Description (optionnel)</label>
                  <textarea
                    className="textarea w-full"
                    rows={3}
                    placeholder="Brève description du flux…"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600">Catégorie / Tag (optionnel)</label>
                  <input
                    className="input w-full"
                    placeholder="Ex: Tech, Sport…"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Fréquence de mise à jour</label>
                    <select
                      className="select w-full"
                      value={updateFreq}
                      onChange={e =>
                        setUpdateFreq(e.target.value as 'hourly' | '6h' | 'daily')
                      }
                    >
                      <option value="hourly">Toutes les heures</option>
                      <option value="6h">Toutes les 6 heures</option>
                      <option value="daily">Quotidien</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600">Statut</label>
                    <select
                      className="select w-full"
                      value={status}
                      onChange={e => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    >
                      <option value="ACTIVE">Actif</option>
                      <option value="INACTIVE">Inactif</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                >
                  Annuler
                </button>
                <button className="btn btn-primary" type="submit">
                  Créer le flux
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
