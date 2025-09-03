'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

type Props = {
  token: string;
  onImported?: () => void;
};

export default function ImportExport({ token, onImported }: Props) {
  const [busyExport, setBusyExport] = useState(false); // état en cours d'export
  const [busyImport, setBusyImport] = useState(false); // état en cours d'import
  const [format, setFormat] = useState<'json' | 'opml' | 'csv'>('json'); // format choisi

  // Export des collections
  const doExport = async () => {
    if (!token) return;
    const ok = window.confirm(
      'Export de vos collections et leurs flux.\n\n' +
        'Avertissement : le fichier contiendra des données brutes et lisibles. Continuer ?',
    );
    if (!ok) return;

    try {
      setBusyExport(true);
      const blob = await api.exportCollections(token, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = format === 'json' ? 'json' : format === 'opml' ? 'opml' : 'csv';
      a.href = url;
      a.download = `suprss-collections.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Export impossible.');
    } finally {
      setBusyExport(false);
    }
  };

  // Import d’un fichier de collections
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!token || !f) return;
    try {
      setBusyImport(true);
      await api.importCollections(token, f);
      e.target.value = ''; 
      onImported?.();
      alert('Import terminé');
    } catch (e) {
      console.error(e);
      alert('Import impossible.');
    } finally {
      setBusyImport(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bloc export */}
      <div className="card p-3 space-y-2">
        <div className="font-medium">Exporter mes collections</div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Exporte toutes vos collections (personnelles + partagées dont vous êtes le créateur) avec leurs
          flux, en JSON, OPML ou CSV.
        </p>
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 rounded-lg border text-sm
                       bg-white text-gray-900 border-gray-300
                       dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700"
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
          >
            <option value="json">JSON</option>
            <option value="opml">OPML</option>
            <option value="csv">CSV</option>
          </select>

          <button
            className="px-4 py-2 rounded-lg text-sm font-medium
                       bg-brand text-white hover:bg-brand-dark
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50
                       disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={doExport}
            disabled={busyExport}
          >
            {busyExport ? 'Export…' : 'Exporter'}
          </button>
        </div>
      </div>

      {/* Bloc import */}
      <div className="card p-3 space-y-2">
        <div className="font-medium">Importer des collections</div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Importez un fichier <strong className="text-gray-800 dark:text-gray-100">JSON / OPML / CSV</strong>.
          Les collections seront recréées avec leurs flux, et vous en serez le propriétaire.
        </p>

        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                          bg-brand text-white hover:bg-brand-dark cursor-pointer
                          focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/50
                          disabled:opacity-60">
          {busyImport ? 'Import…' : 'Importer'}
          <input
            type="file"
            className="hidden"
            accept=".json,application/json,.opml,.xml,text/xml,.csv,text/csv"
            onChange={onImport}
            disabled={busyImport}
          />
        </label>
      </div>
    </div>
  );
}
