import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/constants/languages";
import { COUNTRIES } from "@/constants/countries";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "@radix-ui/react-icons";

interface ProfileProps {
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string | null;
    languages: {
      source: string;
      target: string;
    }[];
    employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
    status: "available" | "busy" | "pause" | "unavailable";
    address: {
      street: string;
      postal_code: string;
      city: string;
    } | null;
    birth_country: string | null;
    nationality: string | null;
    phone_interpretation_rate: number | null;
    siret_number: string | null;
    vat_number: string | null;
    profile_picture_url: string | null;
  };
  onProfileUpdate: () => Promise<void>;
  onProfilePictureUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onProfilePictureDelete: () => Promise<void>;
}

export const InterpreterProfile = ({ profile, onProfileUpdate, onProfilePictureUpload, onProfilePictureDelete }: ProfileProps) => {
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "");
  const [street, setStreet] = useState(profile.address?.street || "");
  const [postalCode, setPostalCode] = useState(profile.address?.postal_code || "");
  const [city, setCity] = useState(profile.address?.city || "");
  const [birthCountry, setBirthCountry] = useState(profile.birth_country || "");
  const [nationality, setNationality] = useState(profile.nationality || "");
  const [phoneInterpretationRate, setPhoneInterpretationRate] = useState<number | null>(profile.phone_interpretation_rate);
  const [siretNumber, setSiretNumber] = useState(profile.siret_number || "");
  const [vatNumber, setVatNumber] = useState(profile.vat_number || "");
  const [selectedLanguages, setSelectedLanguages] = useState(profile.languages);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState<Date | undefined>(new Date("2023-01-23"));

  useEffect(() => {
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setPhoneNumber(profile.phone_number || "");
    setStreet(profile.address?.street || "");
    setPostalCode(profile.address?.postal_code || "");
    setCity(profile.address?.city || "");
    setBirthCountry(profile.birth_country || "");
    setNationality(profile.nationality || "");
    setPhoneInterpretationRate(profile.phone_interpretation_rate);
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
          phone_interpretation_rate: phoneInterpretationRate,
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
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>Mettez à jour vos informations personnelles.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
            <Input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="street">Rue</Label>
              <Input
                type="text"
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="postalCode">Code postal</Label>
              <Input
                type="text"
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="birthCountry">Pays de naissance</Label>
              <Select 
                value={birthCountry}
                onValueChange={setBirthCountry}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nationality">Nationalité</Label>
              <Select 
                value={nationality}
                onValueChange={setNationality}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une nationalité" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label htmlFor="phoneInterpretationRate">Tarif d'interprétation téléphonique (€/min)</Label>
            <Input
              type="number"
              id="phoneInterpretationRate"
              value={phoneInterpretationRate !== null ? phoneInterpretationRate.toString() : ""}
              onChange={(e) => setPhoneInterpretationRate(e.target.value === "" ? null : parseFloat(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="siretNumber">Numéro SIRET</Label>
              <Input
                type="text"
                id="siretNumber"
                value={siretNumber}
                onChange={(e) => setSiretNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vatNumber">Numéro de TVA</Label>
              <Input
                type="text"
                id="vatNumber"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Langues</CardTitle>
          <CardDescription>Ajouter vos paires de langues.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {selectedLanguages.map((language, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div className="grid gap-2">
                  <Label htmlFor={`sourceLanguage-${index}`}>Langue source</Label>
                  <Select value={language.source}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANGUAGES).map(([code, name]) => (
                        <SelectItem key={code} value={code} onSelect={(value) => handleLanguageChange(index, "source", value)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`targetLanguage-${index}`}>Langue cible</Label>
                  <Select value={language.target}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANGUAGES).map(([code, name]) => (
                        <SelectItem key={code} value={code} onSelect={(value) => handleLanguageChange(index, "target", value)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={() => handleLanguageRemove(index)} disabled={isDeleting}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={handleLanguageAdd}>Ajouter une langue</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photo de profil</CardTitle>
          <CardDescription>Mettez à jour votre photo de profil.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-4">
            <Avatar>
              {profile.profile_picture_url ? (
                <AvatarImage src={profile.profile_picture_url} alt="Profile picture" />
              ) : (
                <AvatarFallback>{profile.first_name[0]}{profile.last_name[0]}</AvatarFallback>
              )}
            </Avatar>
            <div className="space-y-2">
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Télécharger une nouvelle photo
              </Button>
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={onProfilePictureUpload}
              />
              {profile.profile_picture_url && (
                <Button variant="destructive" onClick={onProfilePictureDelete} disabled={isDeleting}>
                  Supprimer la photo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleProfileUpdate} disabled={isSaving}>
        {isSaving ? "Enregistrement..." : "Mettre à jour le profil"}
      </Button>
    </div>
  );
};
