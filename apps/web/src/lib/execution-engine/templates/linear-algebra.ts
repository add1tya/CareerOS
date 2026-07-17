import type { SkillExecutionTemplate } from "./index";

/** Linear Algebra — from ontology Suggested Projects (implement matrix ops, SVD, PCA). */
export const linearAlgebraTemplate: SkillExecutionTemplate = {
  skillKey: "linear-algebra",
  templateVersion: 1,
  mission: {
    title: "Build linear algebra intuition from scratch",
    description:
      "Implement the operations behind modern ML by hand — vectors, matrices, decomposition — then apply them to a real dimensionality-reduction task.",
  },
  quests: [
    {
      title: "Implement core operations",
      description:
        "Write matrix/vector operations from scratch and verify against NumPy.",
      tasks: [
        {
          title: "Implement vector and matrix operations",
          description:
            "Add, scale, and dot vectors and matrices without a library.",
          estimatedMinutes: 60,
        },
        {
          title: "Implement matrix multiplication",
          description:
            "Write matmul from scratch and confirm results match NumPy on random inputs.",
          estimatedMinutes: 60,
        },
        {
          title: "Implement transpose and inverse",
          description:
            "Compute transpose and a 2x2/3x3 inverse, checking A·A⁻¹ ≈ I.",
          estimatedMinutes: 75,
        },
        {
          title: "Write tests comparing to NumPy",
          description:
            "Add tests asserting your operations match NumPy within tolerance.",
          estimatedMinutes: 45,
        },
      ],
    },
    {
      title: "Apply it: PCA from scratch",
      description:
        "Use decomposition to reduce a real dataset's dimensionality.",
      tasks: [
        {
          title: "Implement eigendecomposition or SVD",
          description:
            "Implement (or derive via power iteration) the decomposition PCA needs.",
          estimatedMinutes: 90,
        },
        {
          title: "Build PCA on a real dataset",
          description:
            "Center the data, project onto top components, and reconstruct.",
          estimatedMinutes: 75,
        },
        {
          title: "Visualize the reduced dimensions",
          description:
            "Plot the 2D projection and describe what structure appears.",
          estimatedMinutes: 45,
        },
        {
          title: "Write up the geometric interpretation",
          description:
            "Explain in a paragraph what the principal components mean geometrically.",
          estimatedMinutes: 30,
        },
      ],
    },
  ],
};
