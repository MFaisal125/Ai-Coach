export const checkUser = async () => {
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();

  if (!user) {
    return null;
  }

  try {
    const { data: loggedInUser, error: findError } = await supabase
      .from("User")
      .select("*")
      .eq("clerkUserId", user.id)
      .single();

    if (loggedInUser && !findError) {
      return loggedInUser;
    }

    const name = `${user.firstName} ${user.lastName}`;

    const { data: newUser, error: createError } = await supabase
      .from("User")
      .insert([
        {
          clerkUserId: user.id,
          name,
          imageUrl: user.imageUrl,
          email: user.emailAddresses[0].emailAddress,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (createError) throw createError;

    return newUser;
  } catch (error) {
    console.log("Error in checkUser:", error.message);
    return null;
  }
};
