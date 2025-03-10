import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Profile } from "@/types/profile";
import { employmentStatusLabels } from "@/types/employment";

interface ProfileProps {
  profile: Profile;
  onProfileUpdate: () => Promise<void>;
  onProfilePictureUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onProfilePictureDelete: () => Promise<void>;
}

const getEmploymentStatusLabel = (status: Profile["employment_status"]) => {
  return employmentStatusLabels[status] || status;
};

export const InterpreterProfile = ({ profile, onProfileUpdate, onProfilePictureUpload, onProfilePictureDelete }: ProfileProps) => {
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "");
  const [street, setStreet] = useState(profile.address?.street || "");
  const [postalCode, setPostalCode] = useState(profile.address?.postal_code || "");
  const [city, setCity] = useState(profile.address?.city || "");
  const [birthCountry, setBirthCountry] = useState(profile.birth_country || "");
  const [nationality, setNationality] = useState(profile.nationality || "");
  const [siretNumber, setSiretNumber] = useState(profile.siret_number || "");
  const [vatNumber, setVatNumber] = useState(profile.vat_number || "");
  const [selectedLanguages, setSelectedLanguages] = useState(profile.languages);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setPhoneNumber(profile.phone_number || "");
    setStreet(profile.address?.street || "");
    setPostalCode(profile.address?.postal_code || "");
    setCity(profile.address?.city || "");
    setBirthCountry(profile.birth_country || "");
    setNationality(profile.nationality || "");
    setSiretNumber(profile.siret_number || "");
    setVatNumber(profile.vat_number || "");
    setSelectedLanguages(profile.languages);
  }, [profile]);

  const handleLanguageAdd = () => {
    setSelectedLanguages([...selectedLanguages, { source: "", target: "" }]);
  };

  const handleLanguageChange = (index: number, field: "source" | "target", value: string) => {
    const newLanguages = [...selectedLanguages];
    newLanguages[index] = {
      ...newLanguages[index],
      [field]: value
    };
    setSelectedLanguages(newLanguages);
  };

  const handleLanguageRemove = (index: number) => {
    const newLanguages = [...selectedLanguages];
    newLanguages.splice(index, 1);
    setSelectedLanguages(newLanguages);
  };

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const languagesStringArray = selectedLanguages.map(lang => `${lang.source} → ${lang.target}`);

      const { error } = await supabase
        .from('interpreter_profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          address: {
            street: street,
            postal_code: postalCode,
            city: city
          },
          birth_country: birthCountry,
          nationality: nationality,
          siret_number: siretNumber,
          vat_number: vatNumber,
          languages: languagesStringArray
        })
        .eq('id', user.id);

      if (error) throw error;

      await onProfileUpdate();
      toast({
        title: "Profil mis à jour",
        description: "Votre profil a été mis à jour avec succès",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre profil",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-4rem)] w-full">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-32">
        <Card className="border-0 shadow-none">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-xl md:text-2xl">Informations personnelles</CardTitle>
            <CardDescription>Consulter vos informations personnelles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Prénom</Label>
                <Input type="text" value={profile.first_name} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Nom</Label>
                <Input type="text" value={profile.last_name} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Email</Label>
              <Input type="email" value={profile.email} readOnly className="bg-muted" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Téléphone mobile</Label>
                <Input type="tel" value={profile.phone_number || ''} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Téléphone fixe</Label>
                <Input type="tel" value={profile.landline_phone || ''} readOnly className="bg-muted" />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Rue</Label>
                <Input type="text" value={profile.address?.street || ''} readOnly className="bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">Code postal</Label>
                  <Input type="text" value={profile.address?.postal_code || ''} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Ville</Label>
                  <Input type="text" value={profile.address?.city || ''} readOnly className="bg-muted" />
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Pays de naissance</Label>
                <Input type="text" value={profile.birth_country || ''} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Nationalité</Label>
                <Input type="text" value={profile.nationality || ''} readOnly className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-xl md:text-2xl">Informations professionnelles</CardTitle>
            <CardDescription>Consulter vos informations professionnelles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 md:px-6">
            <div className="space-y-2">
              <Label className="font-medium">Statut professionnel</Label>
              <Input 
                type="text" 
                value={getEmploymentStatusLabel(profile.employment_status)} 
                readOnly 
                className="bg-muted"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Tarif (15 minutes)</Label>
                <Input type="text" value={`${profile.tarif_15min} €`} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Tarif (5 minutes)</Label>
                <Input type="text" value={`${profile.tarif_5min} €`} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="font-medium">Numéro SIRET</Label>
                <Input type="text" value={profile.siret_number || ''} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Numéro de TVA</Label>
                <Input type="text" value={profile.vat_number || ''} readOnly className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-xl md:text-2xl">Langues</CardTitle>
            <CardDescription>Vos paires de langues.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="space-y-3">
              {profile.languages.map((lang, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted p-3 rounded-md">
                  <Badge variant="secondary" className="text-sm">{lang.source}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="secondary" className="text-sm">{lang.target}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-none">
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-xl md:text-2xl">Photo de profil</CardTitle>
            <CardDescription>Gérer votre photo de profil.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Avatar className="h-24 w-24">
                {profile.profile_picture_url ? (
                  <AvatarImage src={profile.profile_picture_url} alt="Photo de profil" className="object-cover" />
                ) : (
                  <AvatarFallback className="text-2xl">{profile.first_name[0]}{profile.last_name[0]}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col w-full gap-2">
                <Button variant="secondary" onClick={() => document.getElementById('profile-picture-input')?.click()}>
                  Télécharger une nouvelle photo
                </Button>
                <Input
                  id="profile-picture-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onProfilePictureUpload}
                />
                {profile.profile_picture_url && (
                  <Button variant="destructive" onClick={onProfilePictureDelete}>
                    Supprimer la photo
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
