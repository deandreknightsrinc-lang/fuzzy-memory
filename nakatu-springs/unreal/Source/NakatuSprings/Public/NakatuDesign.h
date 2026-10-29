// Reads designs saved by the browser designer (nakatu-springs/index.html, "Design for Unreal").
// Site frame in the file: meters, x = east, y = north, origin at the site center.
// Unreal frame here: centimeters, X = east, Y = south, Z = up, which is the frame
// CesiumGeoreference uses at its origin. Put the georeference origin on the site origin.

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "NakatuDesign.generated.h"

USTRUCT(BlueprintType)
struct NAKATUSPRINGS_API FNakatuPlacement
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	FString Estate;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	FString Id;

	/** main, home, guest, hall, workshop, garage, pavilion */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	FString Type;

	/** Site meters, east. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	double X = 0.0;

	/** Site meters, north. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	double Y = 0.0;

	/** Degrees counterclockwise from east, seen from above. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	double YawDeg = 0.0;

	/** Footprint width and depth, and height, in meters. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	double W = 10.0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	double D = 10.0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	double H = 5.0;
};

USTRUCT(BlueprintType)
struct NAKATUSPRINGS_API FNakatuSiteInfo
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	FString Name;

	/** False until latitude and longitude are set in the designer's Site settings. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	bool bHasOrigin = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	double Latitude = 0.0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	double Longitude = 0.0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	double Height = 0.0;

	/** Springs center in site meters (x east, y north) and radius in meters. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	FVector2D Spring = FVector2D::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	double SpringRadius = 0.0;
};

UCLASS()
class NAKATUSPRINGS_API UNakatuDesignLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/** Parses the JSON text of a design file. Returns false and fills OutError when it can't. */
	UFUNCTION(BlueprintCallable, Category = "Nakatu")
	static bool ParseDesign(const FString& JsonText, FNakatuSiteInfo& OutSite, TArray<FNakatuPlacement>& OutPlacements, FString& OutError);

	UFUNCTION(BlueprintCallable, Category = "Nakatu")
	static bool LoadDesignFile(const FString& Path, FNakatuSiteInfo& OutSite, TArray<FNakatuPlacement>& OutPlacements, FString& OutError);

	/** Site meters to Unreal centimeters at ground level zero. */
	UFUNCTION(BlueprintPure, Category = "Nakatu")
	static FVector SiteToUnreal(double X, double Y, double Z = 0.0);

	/** Where a building sits and faces. Scale is left at one. */
	UFUNCTION(BlueprintPure, Category = "Nakatu")
	static FTransform PlacementTransform(const FNakatuPlacement& Placement);
};
