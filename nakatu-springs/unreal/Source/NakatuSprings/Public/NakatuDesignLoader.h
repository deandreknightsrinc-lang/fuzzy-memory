// Drop this actor in a level at the world origin, point it at a design file and press Rebuild.
// Each building becomes a box sized to its footprint and height (swap in real meshes per type).

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "NakatuDesign.h"
#include "NakatuDesignLoader.generated.h"

class UStaticMesh;
class UStaticMeshComponent;
class UMaterialInterface;

UCLASS(Blueprintable)
class NAKATUSPRINGS_API ANakatuDesignLoader : public AActor
{
	GENERATED_BODY()

public:
	ANakatuDesignLoader();

	/** A design saved with "Design for Unreal". Relative paths start at the project folder. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu", meta = (FilePathFilter = "json"))
	FFilePath DesignFile;

	/** Mesh per building type (main, home, guest, hall, workshop, garage, pavilion). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	TMap<FString, TObjectPtr<UStaticMesh>> MeshByType;

	/** Used for types with no mesh above. Scaled from a 1 m cube to each building's size. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	TObjectPtr<UStaticMesh> DefaultMesh;

	/** True when the meshes above are 1 m cubes to be stretched; false to keep real meshes at scale one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	bool bScaleToFootprint = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	TObjectPtr<UMaterialInterface> Material;

	/** Drop each building onto whatever is below it (Cesium terrain, the site landscape). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Nakatu")
	bool bSnapToGround = true;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Nakatu")
	FNakatuSiteInfo Site;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Nakatu")
	TArray<FNakatuPlacement> Placements;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Nakatu")
	FString LastError;

	UFUNCTION(CallInEditor, BlueprintCallable, Category = "Nakatu")
	void Rebuild();

	UFUNCTION(CallInEditor, BlueprintCallable, Category = "Nakatu")
	void Clear();

protected:
	virtual void BeginPlay() override;

private:
	UPROPERTY()
	TArray<TObjectPtr<UStaticMeshComponent>> Spawned;

	double GroundZ(const FVector& At) const;
};
