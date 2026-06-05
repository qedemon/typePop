# Brewfile — third-party dependencies for TypePop
#
# Install everything with:
#   brew bundle
#
# These replace the FreeType / FreeImage / GLM copies that used to be vendored
# in this repo. The Xcode project finds them through Dependencies.xcconfig.

brew "freetype"     # font loading / glyph outlines (provides ft2build.h, libfreetype)
brew "freeimage"    # image loading (provides FreeImage.h, libfreeimage)
brew "glm"          # header-only GL math library (provides <glm/glm.hpp>)
brew "dylibbundler" # build tool: embeds the dylibs above into the .app bundle
