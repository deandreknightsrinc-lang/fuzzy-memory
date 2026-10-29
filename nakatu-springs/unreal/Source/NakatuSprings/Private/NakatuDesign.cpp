#include "NakatuDesign.h"

#include "Dom/JsonObject.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace
{
	const FString DesignFormat = TEXT("nakatu-design");
	constexpr int32 MaxVersion = 1;
}

bool UNakatuDesignLibrary::ParseDesign(const FString& JsonText, FNakatuSiteInfo& OutSite, TArray<FNakatuPlacement>& OutPlacements, FString& OutError)
{
	OutPlacements.Reset();
	OutSite = FNakatuSiteInfo();

	TSharedPtr<FJsonObject> Root;
	const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonText);
	if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
	{
		OutError = TEXT("The file is not valid JSON.");
		return false;
	}
	FString Format;
	if (!Root->TryGetStringField(TEXT("format"), Format) || Format != DesignFormat)
	{
		OutError = TEXT("This is not a Naka'tu Springs design file.");
		return false;
	}
	int32 Version = 0;
	if (!Root->TryGetNumberField(TEXT("version"), Version) || Version > MaxVersion)
	{
		OutError = TEXT("This design was saved by a newer version of the designer.");
		return false;
	}

	const TSharedPtr<FJsonObject>* Site = nullptr;
	if (Root->TryGetObjectField(TEXT("site"), Site))
	{
		(*Site)->TryGetStringField(TEXT("name"), OutSite.Name);
		const TSharedPtr<FJsonObject>* Origin = nullptr;
		if ((*Site)->TryGetObjectField(TEXT("origin"), Origin))
		{
			// Latitude and longitude are null until the real site is set.
			const bool bLat = (*Origin)->TryGetNumberField(TEXT("lat"), OutSite.Latitude);
			const bool bLon = (*Origin)->TryGetNumberField(TEXT("lon"), OutSite.Longitude);
			(*Origin)->TryGetNumberField(TEXT("height"), OutSite.Height);
			OutSite.bHasOrigin = bLat && bLon;
		}
		const TSharedPtr<FJsonObject>* Spring = nullptr;
		if ((*Site)->TryGetObjectField(TEXT("spring"), Spring))
		{
			(*Spring)->TryGetNumberField(TEXT("x"), OutSite.Spring.X);
			(*Spring)->TryGetNumberField(TEXT("y"), OutSite.Spring.Y);
			(*Spring)->TryGetNumberField(TEXT("radius"), OutSite.SpringRadius);
		}
	}

	const TArray<TSharedPtr<FJsonValue>>* Placements = nullptr;
	if (!Root->TryGetArrayField(TEXT("placements"), Placements))
	{
		OutError = TEXT("No placements in the file. Use \"Design for Unreal\" in the designer to save it.");
		return false;
	}
	for (const TSharedPtr<FJsonValue>& Value : *Placements)
	{
		const TSharedPtr<FJsonObject> P = Value->AsObject();
		if (!P.IsValid())
		{
			continue;
		}
		FNakatuPlacement Out;
		P->TryGetStringField(TEXT("estate"), Out.Estate);
		P->TryGetStringField(TEXT("id"), Out.Id);
		P->TryGetStringField(TEXT("type"), Out.Type);
		P->TryGetNumberField(TEXT("x"), Out.X);
		P->TryGetNumberField(TEXT("y"), Out.Y);
		P->TryGetNumberField(TEXT("yawDeg"), Out.YawDeg);
		P->TryGetNumberField(TEXT("w"), Out.W);
		P->TryGetNumberField(TEXT("d"), Out.D);
		P->TryGetNumberField(TEXT("h"), Out.H);
		OutPlacements.Add(MoveTemp(Out));
	}
	return true;
}

bool UNakatuDesignLibrary::LoadDesignFile(const FString& Path, FNakatuSiteInfo& OutSite, TArray<FNakatuPlacement>& OutPlacements, FString& OutError)
{
	FString FullPath = Path;
	if (FPaths::IsRelative(FullPath))
	{
		FullPath = FPaths::Combine(FPaths::ProjectDir(), FullPath);
	}
	FString Text;
	if (!FFileHelper::LoadFileToString(Text, *FullPath))
	{
		OutError = FString::Printf(TEXT("Could not read %s"), *FullPath);
		return false;
	}
	return ParseDesign(Text, OutSite, OutPlacements, OutError);
}

FVector UNakatuDesignLibrary::SiteToUnreal(double X, double Y, double Z)
{
	// North is -Y in the georeference frame.
	return FVector(X * 100.0, -Y * 100.0, Z * 100.0);
}

FTransform UNakatuDesignLibrary::PlacementTransform(const FNakatuPlacement& Placement)
{
	// Counterclockwise from east in the site frame is clockwise from +X toward -Y here.
	const FRotator Rotation(0.0, -Placement.YawDeg, 0.0);
	return FTransform(Rotation, SiteToUnreal(Placement.X, Placement.Y));
}
