#include "Misc/AutomationTest.h"
#include "NakatuDesign.h"

#if WITH_DEV_AUTOMATION_TESTS

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FNakatuDesignParseTest, "Nakatu.Design.Parse",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FNakatuDesignParseTest::RunTest(const FString& Parameters)
{
	const FString Json = TEXT(R"({
		"format": "nakatu-design", "version": 1,
		"site": { "name": "Test", "origin": { "lat": 35, "lon": -110, "height": 0 }, "spring": { "x": 570, "y": 40, "radius": 45 } },
		"placements": [ { "estate": "E7", "id": "B1", "type": "main", "x": 10, "y": -20, "yawDeg": 90, "w": 24, "d": 16, "h": 8 } ]
	})");

	FNakatuSiteInfo Site;
	TArray<FNakatuPlacement> Placements;
	FString Error;
	TestTrue(TEXT("parses"), UNakatuDesignLibrary::ParseDesign(Json, Site, Placements, Error));
	TestTrue(TEXT("has origin"), Site.bHasOrigin);
	TestEqual(TEXT("one placement"), Placements.Num(), 1);

	const FTransform T = UNakatuDesignLibrary::PlacementTransform(Placements[0]);
	TestEqual(TEXT("east is +X"), T.GetLocation().X, 1000.0);
	TestEqual(TEXT("south is +Y"), T.GetLocation().Y, 2000.0);
	TestEqual(TEXT("counterclockwise yaw flips"), T.Rotator().Yaw, -90.0, 1e-6);

	TestFalse(TEXT("rejects other files"), UNakatuDesignLibrary::ParseDesign(TEXT("{\"hello\":1}"), Site, Placements, Error));
	return true;
}

#endif
