import React, { useEffect, useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSettings, saveSettings } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const Pengaturan = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nama_instansi: '',
    alamat_instansi: '',
    kota: '',
    propinsi: '',
    nomor_telepon: '',
    email: '',
    website: '', 
    sosial_media: ''
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  useEffect(() => {
    if (settingsData?.data) {
      setFormData(prev => ({
        ...prev,
        ...settingsData.data
      }));
    }
  }, [settingsData]);

  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: (data) => {
      if (data.status === 'success') {
        toast({
          title: "Berhasil",
          description: "Pengaturan berhasil disimpan",
        });
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      } else {
        toast({
          title: "Gagal",
          description: data.message || "Gagal menyimpan pengaturan",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Terjadi kesalahan koneksi",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    mutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pengaturan Aplikasi</h1>
        <p className="text-muted-foreground mt-1">Kelola informasi identitas klinik</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">Informasi Klinik</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Data disimpan sebagai satu record</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nama_instansi">Nama Klinik *</Label>
            <Input 
              id="nama_instansi" 
              value={formData.nama_instansi} 
              onChange={handleChange} 
              placeholder="Nama Instansi" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alamat_instansi">Alamat</Label>
            <Textarea 
              id="alamat_instansi" 
              value={formData.alamat_instansi} 
              onChange={handleChange} 
              placeholder="Alamat Lengkap" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kota">Kota/Kabupaten</Label>
              <Input 
                id="kota" 
                value={formData.kota} 
                onChange={handleChange} 
                placeholder="Kota/Kabupaten" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propinsi">Provinsi</Label>
              <Input 
                id="propinsi" 
                value={formData.propinsi} 
                onChange={handleChange} 
                placeholder="Provinsi" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nomor_telepon">Nomor Telepon</Label>
              <Input 
                id="nomor_telepon" 
                value={formData.nomor_telepon} 
                onChange={handleChange} 
                placeholder="Nomor Telepon" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="Email Instansi" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input 
                id="website" 
                value={formData.website} 
                onChange={handleChange} 
                placeholder="Website" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sosial_media">Sosial Media</Label>
              <Input 
                id="sosial_media" 
                value={formData.sosial_media} 
                onChange={handleChange} 
                placeholder="Akun Sosial Media" 
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmit}
              disabled={mutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pengaturan;
