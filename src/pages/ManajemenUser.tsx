import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsersList,
  saveUser,
  deleteUser,
  getMasterList
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  User,
  Users,
  Shield,
  Stethoscope,
  Pencil,
  Key,
  Link as LinkIcon,
  Trash2,
  Loader2,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface UserData {
  id: string;
  username: string;
  fullname: string; 
  role: string;
  status: string;
  email: string;
  cap: string;
  access: string;
  login_terakhir?: string;
}

export default function ManajemenUser() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullname: "",
    role: "",
    status: "Aktif",
    email: "",
    cap: [] as string[],
    access: [] as string[],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: () => getUsersList(1, 100, search),
  });

  const users = usersData?.data || [];

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (user: UserData) => deleteUser({ id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "User dihapus",
        description: "Data user berhasil dihapus dari sistem",
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: () => {
      toast({
        title: "Gagal menghapus",
        description: "Terjadi kesalahan saat menghapus user",
        variant: "destructive",
      });
    },
  });

  // Stats Calculation
  const stats = {
    total: users.length,
    dokter: users.filter((u: any) => u.role?.toLowerCase() === "medis").length,
    perawat: users.filter((u: any) => u.role?.toLowerCase() === "paramedis").length,
    staff: users.filter((u: any) => ["staff", "admin", "apoteker"].includes(u.role?.toLowerCase())).length,
  };

  const { data: modulesData } = useQuery({
    queryKey: ["modules"],
    queryFn: () => getMasterList("mlite_modules", 1, 100),
  });

  const { data: poliData } = useQuery({
    queryKey: ["poliklinik"],
    queryFn: () => getMasterList("poliklinik", 1, 100),
  });

  const { data: bangsalData } = useQuery({
    queryKey: ["bangsal"],
    queryFn: () => getMasterList("bangsal", 1, 100),
  });

  const modules = modulesData?.data || [];
  const poliList = poliData?.data || [];
  const bangsalList = bangsalData?.data || [];

  const handleEdit = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      ...formData,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      status: user.status,
      email: user.email,
      cap: user.cap ? user.cap.split(',') : [],
      access: user.access ? user.access.split(',') : [],
    });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setFormData({
      username: "",
      password: "",
      fullname: "",
      role: "",
      status: "Aktif",
      email: "",
      cap: [],
      access: [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = (user: UserData) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => saveUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: selectedUser ? "User diperbarui" : "User dibuat",
        description: selectedUser
          ? "Data user berhasil diperbarui"
          : "User baru berhasil ditambahkan",
      });
      setIsModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Gagal menyimpan",
        description: "Terjadi kesalahan saat menyimpan data user",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      ...formData,
      id: selectedUser?.id,
      cap: formData.cap.join(','),
      access: formData.access.join(','),
    });
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen User</h1>
          <p className="text-muted-foreground">
            Kelola akun pengguna dan hak akses sistem
          </p>
        </div>
        <Button onClick={handleAdd} className="bg-emerald-500 hover:bg-emerald-600">
          <Plus className="mr-2 h-4 w-4" /> Tambah User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Total User"
          value={stats.total}
          icon={Users}
          color="text-emerald-500"
        />
        <StatsCard
          title="Dokter"
          value={stats.dokter}
          icon={Shield}
          color="text-blue-500"
        />
        <StatsCard
          title="Perawat"
          value={stats.perawat}
          icon={User}
          color="text-emerald-500"
        />
        <StatsCard
          title="Staff"
          value={stats.staff}
          icon={Users}
          color="text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: User List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daftar Pengguna
              </CardTitle>
              <CardDescription>
                Kelola semua pengguna yang memiliki akses ke sistem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari berdasarkan fullname, email, atau role..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user: UserData) => (
                    <UserItem
                      key={user.id}
                      user={user}
                      onEdit={() => handleEdit(user)}
                      onDelete={() => handleDelete(user)}
                    />
                  ))}
                  {users.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada data user ditemukan
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Roles */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Hak Akses Role
              </CardTitle>
              <CardDescription>
                Daftar peran dan hak akses dalam sistem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RoleBox
                role="Administrator"
                badgeColor="bg-purple-100 text-purple-800 hover:bg-purple-200"
                permissions={[
                  "Kelola User",
                  "manage_inventory",
                  "manage_billing",
                  "manage_schedule",
                ]}
              />
              <RoleBox
                role="Dokter"
                badgeColor="bg-blue-100 text-blue-800 hover:bg-blue-200"
                permissions={[
                  "view_patients",
                  "write_examinations",
                  "write_prescriptions",
                  "view_schedule",
                ]}
              />
              <RoleBox
                role="Staf"
                badgeColor="bg-gray-100 text-gray-800 hover:bg-gray-200"
                permissions={[
                  "manage_billing",
                  "manage_schedule",
                  "manage_inventory",
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-2">
                <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
            </div>
            <AlertDialogTitle className="text-center">Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Apakah Anda yakin ingin menghapus user <strong>{userToDelete?.fullname}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel onClick={() => setUserToDelete(null)} className="mt-0">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sub-components

function StatsCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h2 className={cn("text-3xl font-bold mt-2", color)}>{value}</h2>
        </div>
        <div className={cn("p-3 rounded-full bg-opacity-10", color.replace('text-', 'bg-'))}>
          <Icon className={cn("h-6 w-6", color)} />
        </div>
      </CardContent>
    </Card>
  );
}

function UserItem({ user, onEdit, onDelete }: { user: UserData; onEdit: () => void; onDelete: () => void }) {
  const roleColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-800 hover:bg-purple-200",
    dokter: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    staff: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  };

  const badgeColor = roleColors[user.role?.toLowerCase()] || "bg-gray-100 text-gray-800";

  return (
    <div className="flex flex-col sm:flex-row items-start justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors gap-4">
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-lg">{user.fullname}</span>
          <Badge className={cn("font-normal", badgeColor)}>{user.username}</Badge>
          <Badge
            variant="outline"
            className={cn(
              "font-normal",
              user.role === "admin"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
            )}
          >
            {user.role}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted-foreground mt-2">
          <p>Email: {user.email}</p>
          <p>Capabilitas: {user.cap ? user.cap.split(',').join(', ') : "-"}</p>
          <p className="font-mono text-xs">ID: {user.id}</p>
          <p>Access: {user.access ? user.access.split(',').join(', ') : "-"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function RoleBox({ role, badgeColor, permissions }: any) {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{role}</span>
        <Badge className={cn("font-normal", badgeColor)}>{role}</Badge>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Hak Akses:</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          {permissions.map((perm: string, i: number) => (
            <li key={i}>{perm}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function UserModal({ isOpen, onClose, user }: { isOpen: boolean; onClose: () => void; user: UserData | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullname: "",
    username: "",
    email: "",
    role: "",
    password: "",
    status: "Aktif",
    cap: [] as string[],
    access: [] as string[],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullname: user.fullname || "",
        username: user.username || "",
        email: user.email || "",
        role: user.role || "",
        password: "",
        status: user.status || "Aktif",
        cap: user.cap ? user.cap.split(',').filter(Boolean) : [],
        access: user.access ? user.access.split(',').filter(Boolean) : [],
      });
    } else {
      setFormData({
        fullname: "",
        username: "",
        email: "",
        role: "",
        password: "",
        status: "Aktif",
        cap: [],
        access: [],
      });
    }
  }, [user, isOpen]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => saveUser(data),
    onSuccess: (response) => {
      if (response.status === 'error') {
        toast({
          title: "Gagal menyimpan",
          description: response.message || "Terjadi kesalahan saat menyimpan data",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Berhasil",
        description: `User berhasil ${user ? "diperbarui" : "ditambahkan"}`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan jaringan atau server",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...formData,
      ...(user && { id: user.id }),
      cap: formData.cap.join(','),
      access: formData.access.join(','),
    };
    // Clean up empty password if editing
    if (user && !payload.password) {
      delete payload.password;
    }
    saveMutation.mutate(payload);
  };

  // Fetch Modules, Poliklinik, Bangsal for Form
  const { data: modulesData } = useQuery({
    queryKey: ["modules"],
    queryFn: () => getMasterList("mlite_modules", 1, 100),
  });

  const { data: bangsalData } = useQuery({
    queryKey: ["bangsal"],
    queryFn: () => getMasterList("bangsal", 1, 100),
  });

  const { data: poliData } = useQuery({
    queryKey: ["poliklinik"],
    queryFn: () => getMasterList("poliklinik", 1, 100),
  });

  const modules = modulesData?.data || [];
  const bangsalList = bangsalData?.data || [];
  const poliList = poliData?.data || [];

  const capabilities = [
    ...bangsalList.map((b: any) => ({ id: b.kd_bangsal, name: b.nm_bangsal })),
    ...poliList.map((p: any) => ({ id: p.kd_poli, name: p.nm_poli }))
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{user ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle>
          <DialogDescription>
            {user ? "Perbarui informasi pengguna" : "Tambahkan pengguna baru ke sistem"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullname">Nama Lengkap *</Label>
              <Input
                id="fullname"
                placeholder="Nama Lengkap"
                value={formData.fullname}
                onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medis">Dokter</SelectItem>
                  <SelectItem value="paramedis">Perawat</SelectItem>
                  <SelectItem value="apoteker">Apoteker</SelectItem>
                  <SelectItem value="rekammedis">Rekam Medis</SelectItem>
                  <SelectItem value="kasir">Kasir</SelectItem>
                  <SelectItem value="radiologi">Radiologi</SelectItem>
                  <SelectItem value="laboratorium">Laboratorium</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {user ? "Password Baru (kosongkan jika tidak diubah)" : "Password *"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!user}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Capabilitas (Hak Akses Bangsal/Poli)</Label>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 p-4 border rounded-md max-h-48 overflow-y-auto">
              {capabilities.map((item: any) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cap-${item.id}`}
                    checked={formData.cap.includes(item.id)}
                    onCheckedChange={(checked) => {
                      const newCap = checked
                        ? [...formData.cap, item.id]
                        : formData.cap.filter((c) => c !== item.id);
                      setFormData({ ...formData, cap: newCap });
                    }}
                  />
                  <Label htmlFor={`cap-${item.id}`} className="font-normal cursor-pointer text-sm">
                    {item.name}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Pilih satu atau lebih poliklinik/bangsal.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Akses Modul</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-md max-h-48 overflow-y-auto">
              {modules.map((mod: any) => (
                <div key={mod.dir} className="flex items-center space-x-2">
                  <Checkbox
                    id={`access-${mod.dir}`}
                    checked={formData.access.includes(mod.dir)}
                    onCheckedChange={(checked) => {
                      const newAccess = checked
                        ? [...formData.access, mod.dir]
                        : formData.access.filter((a) => a !== mod.dir);
                      setFormData({ ...formData, access: newAccess });
                    }}
                  />
                  <Label htmlFor={`access-${mod.dir}`} className="font-normal cursor-pointer text-sm">
                    {mod.dir}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Pilih satu atau lebih modul yang diizinkan.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {user ? "Update User" : "Simpan User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}