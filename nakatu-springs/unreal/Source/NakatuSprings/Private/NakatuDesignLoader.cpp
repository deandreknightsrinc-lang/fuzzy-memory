#include "NakatuDesignLoader.h"

#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "UObject/ConstructorHelpers.h"

ANakatuDesignLoader::ANakatuDesignLoader()
{
	PrimaryActorTick.bCanEverTick = false;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
	if (Cube.Succeeded())
	{
		DefaultMesh = Cube.Object;
	}
}

void ANakatuDesignLoader::BeginPlay()
{
	Super::BeginPlay();
	if (Spawned.IsEmpty())
	{
		Rebuild();
	}
}

void ANakatuDesignLoader::Clear()
{
	for (UStaticMeshComponent* Mesh : Spawned)
	{
		if (Mesh)
		{
			RemoveInstanceComponent(Mesh);
			Mesh->DestroyComponent();
		}
	}
	Spawned.Reset();
}

double ANakatuDesignLoader::GroundZ(const FVector& At) const
{
	UWorld* World = GetWorld();
	if (!World)
	{
		return At.Z;
	}
	FHitResult Hit;
	FCollisionQueryParams Params(SCENE_QUERY_STAT(NakatuGround), true, this);
	const FVector From(At.X, At.Y, At.Z + 500000.0);
	const FVector To(At.X, At.Y, At.Z - 500000.0);
	return World->LineTraceSingleByChannel(Hit, From, To, ECC_Visibility, Params) ? Hit.ImpactPoint.Z : At.Z;
}

void ANakatuDesignLoader::Rebuild()
{
	Clear();
	LastError.Reset();
	if (!UNakatuDesignLibrary::LoadDesignFile(DesignFile.FilePath, Site, Placements, LastError))
	{
		UE_LOG(LogTemp, Warning, TEXT("Naka'tu design: %s"), *LastError);
		return;
	}
	if (!Site.bHasOrigin)
	{
		UE_LOG(LogTemp, Warning, TEXT("Naka'tu design has no latitude and longitude yet. Set them in the designer's Site settings, then set the CesiumGeoreference origin to match."));
	}

	const FTransform ActorToWorld = GetActorTransform();
	for (const FNakatuPlacement& P : Placements)
	{
		const TObjectPtr<UStaticMesh>* Found = MeshByType.Find(P.Type);
		UStaticMesh* Mesh = Found && *Found ? Found->Get() : DefaultMesh.Get();
		if (!Mesh)
		{
			continue;
		}

		FTransform Local = UNakatuDesignLibrary::PlacementTransform(P);
		const FVector WorldLocation = ActorToWorld.TransformPosition(Local.GetLocation());
		const double Ground = bSnapToGround ? GroundZ(WorldLocation) : WorldLocation.Z;
		FVector LocalLocation = Local.GetLocation();
		LocalLocation.Z += Ground - WorldLocation.Z;

		UStaticMeshComponent* Comp = NewObject<UStaticMeshComponent>(this, NAME_None, RF_Transactional);
		Comp->SetStaticMesh(Mesh);
		if (Material)
		{
			Comp->SetMaterial(0, Material);
		}
		Comp->SetupAttachment(RootComponent);
		if (bScaleToFootprint)
		{
			// The engine cube is 100 cm with its pivot in the middle.
			Local.SetScale3D(FVector(P.W, P.D, P.H));
			LocalLocation.Z += P.H * 50.0;
		}
		Local.SetLocation(LocalLocation);
		Comp->SetRelativeTransform(Local);
		Comp->ComponentTags.Add(FName(*FString::Printf(TEXT("%s/%s"), *P.Estate, *P.Id)));
		AddInstanceComponent(Comp);
		Comp->RegisterComponent();
		Spawned.Add(Comp);
	}
	UE_LOG(LogTemp, Log, TEXT("Naka'tu design '%s': placed %d buildings"), *Site.Name, Spawned.Num());
}
