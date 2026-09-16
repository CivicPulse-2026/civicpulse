import asyncio

from app.services.ai_analyzer import analyze_complaint


async def main():
    complaint = (
        "There has been no street light near Gate 3 for almost a week "
        "and the road gets extremely dark."
    )

    result = await analyze_complaint(complaint)

    print("\nCIVICPULSE AI ANALYSIS")
    print("======================")
    print(result.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())